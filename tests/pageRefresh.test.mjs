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

test('菜单数据模块在返回时更新菜品和 Wi-Fi，静默读取及失败均保留已有内容', async () => {
  const env = environment()
  const pending = deferred()
  let round = 'initial'
  let mounted
  const unmounted = []
  let calls = 0
  const errors = []
  const source = readFileSync(new URL('../src/composables/useMenuData.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export function', 'function')
  const state = runInNewContext(`(() => {
    ${source}
    return useMenuData(sanityClient)
  })()`, {
    ref: value => ({value}),
    computed: getter => ({get value() { return getter() }}),
    onMounted: callback => { mounted = callback },
    onUnmounted: callback => { unmounted.push(callback) },
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

test('导航模块锁定目标、保护重复点击，并在滚动停止后恢复跟随', () => {
  const source = readFileSync(new URL('../src/composables/useCategoryNavigation.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export function', 'function')
  const pageScrolls = []
  const navScrolls = []
  const timers = new Map()
  const handlers = new Map()
  const buttons = new Map()
  let mounted
  let unmounted
  let timerId = 0
  const state = runInNewContext(`(() => {${source}; return useCategoryNavigation({value: [
    {categoryId: 'a'}, {categoryId: 'b'}, {categoryId: 'c'}
  ]})})()`, {
    ref: value => ({value}),
    onMounted: callback => {mounted = callback},
    onUnmounted: callback => {unmounted = callback},
    window: {
      scrollY: 500,
      matchMedia: () => ({matches: false}),
      scrollTo: value => pageScrolls.push(value),
      setTimeout: callback => {timers.set(++timerId, callback); return timerId},
      clearTimeout: id => timers.delete(id),
      addEventListener: (name, callback) => handlers.set(name, callback),
      removeEventListener: name => handlers.delete(name),
    },
  })
  mounted()
  state.categoryNav.value = {
    element: {clientWidth: 200, getBoundingClientRect: () => ({height: 56}), scrollTo: value => navScrolls.push(value)},
    getButton: id => buttons.get(id),
  }
  let positions = [0, 800, 1600]
  for (const [i, id] of ['a', 'b', 'c'].entries()) {
    state.setCategoryElement(id, {getBoundingClientRect: () => ({top: positions[i]})})
    buttons.set(id, {offsetLeft: i * 100, offsetWidth: 80})
  }
  state.scrollToCategory(2)
  assert.equal(state.active.value, 2)
  assert.equal(pageScrolls[0].behavior, 'smooth')
  assert.equal(navScrolls.length, 1)
  state.scrollToCategory(2)
  assert.equal(pageScrolls.length, 1, '重复点击不重启页面滚动')
  positions = [-500, 20, 800]
  handlers.get('scroll')()
  assert.equal(state.active.value, 2)
  assert.equal(navScrolls.length, 1)
  state.scrollToCategory(0)
  assert.equal(state.active.value, 0)
  assert.equal(timers.size, 1)
  Array.from(timers.values())[0]()
  handlers.get('scroll')()
  assert.equal(state.active.value, 1)
  state.setCategoryElement('b', null)
  state.scrollToCategory(1)
  assert.equal(pageScrolls.length, 2, '卸载的分类不会再发起滚动')
  unmounted()
  assert.equal(handlers.size, 0)
  assert.equal(timers.size, 0)
})
