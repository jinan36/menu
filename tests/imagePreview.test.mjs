import test from 'node:test'
import assert from 'node:assert/strict'
import {createImagePreview} from '../src/imagePreview.js'

test('下滑和轻点关闭均清理手势，重新打开不受上一次关闭回调影响', () => {
  const calls = []
  const gestures = []
  const preview = createImagePreview(options => {
    calls.push(options)
    return {close: () => options.onClose()}
  }, close => {
    const gesture = {attached: false, disposed: false, close,
      attach() {this.attached = true},
      dispose() {this.disposed = true},
      onScale(value) {this.scale = value.scale},
    }
    gestures.push(gesture)
    return gesture
  })
  preview.open('a.jpg')
  preview.open('b.jpg')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].showIndex, false)
  assert.equal(calls[0].closeable, false)
  calls[0].onScale({scale: 2})
  assert.equal(gestures[0].scale, 2)
  gestures[0].close()
  assert.equal(gestures[0].disposed, true)
  preview.open('b.jpg')
  calls[0].onClose()
  preview.open('c.jpg')
  assert.equal(calls.length, 2)
  calls[1].onClose()
  preview.open('c.jpg')
  assert.equal(calls.length, 3)
  preview.dispose()
  assert.equal(gestures[2].disposed, true)
})
