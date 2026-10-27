import test from 'node:test'
import assert from 'node:assert/strict'
import {createImagePreviewSwipe} from '../src/imagePreviewSwipe.js'

function environment() {
  const handlers = new Map()
  const image = {style: {}}
  const overlay = {style: {setProperty(key, value) {this[key] = value}}}
  let closes = 0
  const doc = {
    querySelector: selector => selector.endsWith('-overlay') ? overlay : image,
    addEventListener: (type, handler) => handlers.set(type, handler),
    removeEventListener: type => handlers.delete(type),
  }
  const swipe = createImagePreviewSwipe(() => closes++, doc)
  swipe.attach()
  const emit = (type, x, y, count = 1, button = false) => {
    let prevented = false
    handlers.get(type)?.({
      target: {closest: selector => selector === '[role="button"]' ? button : image},
      touches: Array.from({length: count}, () => ({clientX: x, clientY: y})),
      cancelable: true,
      preventDefault() {prevented = true},
    })
    return prevented
  }
  return {swipe, emit, image, overlay, handlers, get closes() {return closes}}
}

test('原尺寸单指下滑跟手，超过阈值松手关闭', () => {
  const e = environment()
  e.emit('touchstart', 200, 200)
  assert.equal(e.emit('touchmove', 205, 330), true)
  assert.match(e.image.style.transform, /130px/)
  assert(Number(e.overlay.style.opacity) < 1)
  const releaseOpacity = e.overlay.style.opacity
  e.emit('touchend', 205, 330, 0)
  assert.equal(e.closes, 1)
  assert.equal(e.overlay.style['--menu-preview-opacity'], releaseOpacity)
})

test('短距离回弹，横滑及向上滑动不关闭', () => {
  for (const [dx, dy] of [[0, 60], [150, 30], [0, -150]]) {
    const e = environment()
    e.emit('touchstart', 200, 200)
    e.emit('touchmove', 200 + dx, 200 + dy)
    e.emit('touchend', 200 + dx, 200 + dy, 0)
    assert.equal(e.closes, 0)
    assert.equal(e.image.style.transform, '')
    assert.equal(e.overlay.style['--menu-preview-opacity'], '1')
  }
})

test('放大、双指、取消和关闭按钮均不会触发下滑关闭', () => {
  const e = environment()
  e.swipe.onScale({scale: 2})
  e.emit('touchstart', 200, 200)
  assert.equal(e.emit('touchmove', 200, 400), false)
  e.emit('touchend', 200, 400, 0)
  e.swipe.onScale({scale: 1})
  e.emit('touchstart', 200, 200)
  e.emit('touchmove', 200, 400, 2)
  e.emit('touchend', 200, 400, 0)
  e.emit('touchstart', 200, 200)
  e.emit('touchmove', 200, 400)
  e.emit('touchcancel', 200, 400, 0)
  e.emit('touchstart', 200, 200, 1, true)
  e.emit('touchmove', 200, 400)
  e.emit('touchend', 200, 400, 0)
  assert.equal(e.closes, 0)
  e.swipe.dispose()
  assert.equal(e.handlers.size, 0)
})
