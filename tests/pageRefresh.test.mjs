import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import test from 'node:test'
import {setImmediate} from 'node:timers'
import {createPageRefresh} from '../src/pageRefresh.js'

const settle = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return {promise, resolve}
}
const environment = () => {
  const page = new EventTarget()
  page.visibilityState = 'visible'
  const view = new EventTarget()
  let time = 0
  return {
    page, view,
    now: () => time,
    advance: milliseconds => { time += milliseconds },
    returnToPage() {
      page.visibilityState = 'visible'
      page.dispatchEvent(new Event('visibilitychange'))
      view.dispatchEvent(new Event('focus'))
    },
  }
}

test('首次读取；隐藏时不请求，30 秒内返回不请求，之后返回只读取一次', async () => {
  const env = environment()
  let calls = 0
  const refresh = createPageRefresh(async () => { calls++ }, env)
  refresh.start()
  refresh.start()
  await settle()
  assert.equal(calls, 1)
  env.advance(29_999)
  env.returnToPage()
  await settle()
  assert.equal(calls, 1)
  env.advance(1)
  env.page.visibilityState = 'hidden'
  env.page.dispatchEvent(new Event('visibilitychange'))
  env.view.dispatchEvent(new Event('focus'))
  await settle()
  assert.equal(calls, 1)
  env.returnToPage()
  await settle()
  assert.equal(calls, 2)
  refresh.stop()
})

test('慢请求期间不重复请求；页面历史缓存恢复也能触发更新', async () => {
  const env = environment()
  const pending = deferred()
  let calls = 0
  const refresh = createPageRefresh(async () => { calls++; await pending.promise }, env)
  refresh.start()
  env.advance(60_000)
  env.returnToPage()
  assert.equal(calls, 1)
  pending.resolve()
  await settle()
  env.view.dispatchEvent(Object.assign(new Event('pageshow'), {persisted: false}))
  await settle()
  assert.equal(calls, 1)
  env.view.dispatchEvent(Object.assign(new Event('pageshow'), {persisted: true}))
  await settle()
  assert.equal(calls, 2)
  refresh.stop()
})

test('失败后仍限频并可重试；退出会取消请求且不再响应返回事件', async () => {
  const env = environment()
  const errors = []
  let calls = 0
  let signal
  const pending = deferred()
  const refresh = createPageRefresh(async nextSignal => {
    signal = nextSignal
    if (++calls === 1) throw new Error('offline')
    await pending.promise
  }, {...env, onError: error => errors.push(error)})
  refresh.start()
  await settle()
  assert.equal(errors.length, 1)
  env.returnToPage()
  assert.equal(calls, 1)
  env.advance(30_000)
  env.returnToPage()
  assert.equal(calls, 2)
  refresh.stop()
  assert.equal(signal.aborted, true)
  env.advance(30_000)
  env.returnToPage()
  pending.resolve()
  await settle()
  assert.equal(calls, 2)
})

test('实际菜单脚本在返回时更新菜品和 Wi-Fi，静默读取及失败均保留已有内容', async () => {
  const env = environment()
  const pending = deferred()
  let round = 'initial'
  let mounted
  const unmounted = []
  let calls = 0
  const errors = []
  const source = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
    .match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
  const state = runInNewContext(`(() => {
    ${source}
    return {allDishes, wifi, isLoading}
  })()`, {
    ref: value => ({value}),
    computed: getter => ({get value() { return getter() }}),
    onMounted: callback => { mounted = callback },
    onUnmounted: callback => { unmounted.push(callback) },
    createImagePreview: () => ({open() {}, dispose() {}}),
    createImagePreviewSwipe: () => {},
    window: {addEventListener() {}, removeEventListener() {}, clearTimeout() {}},
    createPageRefresh: refresh => createPageRefresh(refresh, env),
    createDishImages: () => () => ({}),
    console: {error: (...args) => errors.push(args)},
    sanityClient: {
      async fetch(query, params, options) {
        calls++
        assert.ok(options.signal instanceof AbortSignal)
        if (round === 'update') await pending.promise
        if (round === 'offline') throw new Error('offline')
        if (query.includes('restaurantSettings')) {
          return {wifiName: round, wifiPassword: 'test'}
        }
        return [{_id: 'dish', name: round, category: {_id: 'category', name: 'category'}}]
      },
    },
    showImagePreview: () => {},
  })
  mounted()
  await settle()
  assert.equal(state.allDishes.value[0].name, 'initial')
  assert.equal(state.wifi.value.name, 'initial')
  assert.equal(state.isLoading.value, false)
  assert.equal(calls, 2)

  round = 'update'
  env.advance(30_000)
  env.returnToPage()
  assert.equal(state.isLoading.value, false)
  assert.equal(state.allDishes.value[0].name, 'initial')
  pending.resolve()
  await settle()
  assert.equal(state.allDishes.value[0].name, 'update')
  assert.equal(state.wifi.value.name, 'update')
  assert.equal(calls, 4)

  round = 'offline'
  env.advance(30_000)
  env.returnToPage()
  await settle()
  assert.equal(state.allDishes.value[0].name, 'update')
  assert.equal(state.wifi.value.name, 'update')
  assert.equal(state.isLoading.value, false)
  assert.equal(errors.length, 2)
  unmounted.forEach(callback => callback())
})

test('点击远处分类期间锁定导航，停止后恢复随页面选中，连续点击使用最新目标', () => {
  const source = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
    .match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
  const pageScrolls = []
  const navScrolls = []
  const timers = new Map()
  let timerId = 0
  const state = runInNewContext(`(() => {${source}; return {
    allDishes, active, categoryNav, categoryElements, categoryButtons, categoryScrollLocked,
    scrollToCategory, onCategoryPageScroll, finishCategoryScroll
  }})()`, {
    ref: value => ({value}), computed: getter => ({get value() {return getter()}}),
    onMounted() {}, onUnmounted() {},
    createPageRefresh: () => ({}), createDishImages: () => () => ({}), sanityClient: {},
    createImagePreview: () => ({}), createImagePreviewSwipe() {}, showImagePreview() {},
    window: {
      scrollY: 500,
      matchMedia: () => ({matches: false}),
      scrollTo: value => pageScrolls.push(value),
      setTimeout: callback => {timers.set(++timerId, callback); return timerId},
      clearTimeout: id => timers.delete(id),
    },
  })
  state.allDishes.value = ['a', 'b', 'c'].map(id => ({category: {_id: id, name: id}}))
  state.categoryNav.value = {clientWidth: 200, getBoundingClientRect: () => ({height: 56}), scrollTo: value => navScrolls.push(value)}
  let positions = [0, 800, 1600]
  for (const [i, id] of ['a', 'b', 'c'].entries()) {
    state.categoryElements.set(id, {getBoundingClientRect: () => ({top: positions[i]})})
    state.categoryButtons.set(id, {offsetLeft: i * 100, offsetWidth: 80})
  }
  state.scrollToCategory(2)
  assert.equal(state.active.value, 2)
  assert.equal(pageScrolls[0].behavior, 'smooth')
  assert.equal(navScrolls.length, 1)
  state.scrollToCategory(2)
  assert.equal(pageScrolls.length, 1, '同一分类快速重复点击不重启页面滚动')
  assert.equal(navScrolls.length, 1)
  positions = [-500, 20, 800]
  state.onCategoryPageScroll()
  assert.equal(state.active.value, 2)
  assert.equal(navScrolls.length, 1)
  state.scrollToCategory(0)
  assert.equal(state.active.value, 0)
  assert.equal(timers.size, 1)
  state.finishCategoryScroll()
  state.onCategoryPageScroll()
  assert.equal(state.active.value, 1)
  assert.equal(state.categoryScrollLocked.value, false)
})
