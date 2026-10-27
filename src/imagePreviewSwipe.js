// 只接管原尺寸图片的单指向下手势；缩放和横向滑动仍交给 Vant。
export function createImagePreviewSwipe(close, doc = document) {
  let scale = 1
  let gesture = null
  let attached = false
  const root = () => doc.querySelector('.menu-image-preview')
  const overlay = () => doc.querySelector('.menu-image-preview-overlay')

  const reset = () => {
    const image = root()
    const background = overlay()
    if (image) {
      image.style.transition = 'transform 180ms ease-out'
      image.style.transform = ''
    }
    if (background) {
      background.style.transition = 'opacity 180ms ease-out'
      background.style.opacity = ''
      background.style.setProperty('--menu-preview-opacity', '1')
    }
  }
  const cancel = () => {
    gesture = null
    reset()
  }
  const start = (event) => {
    if (event.touches.length !== 1 || Math.abs(scale - 1) > 0.01) return cancel()
    const target = event.target
    if (!target?.closest?.('.menu-image-preview') || target.closest('[role="button"]')) return
    const touch = event.touches[0]
    gesture = {x: touch.clientX, y: touch.clientY, distance: 0, direction: null}
  }
  const move = (event) => {
    if (!gesture) return
    if (event.touches.length !== 1 || Math.abs(scale - 1) > 0.01) return cancel()
    const dx = event.touches[0].clientX - gesture.x
    const dy = event.touches[0].clientY - gesture.y
    if (!gesture.direction && Math.max(Math.abs(dx), Math.abs(dy)) > 12) {
      gesture.direction = dy > 0 && dy > Math.abs(dx) * 1.2 ? 'down' : 'other'
    }
    if (gesture.direction !== 'down') return
    gesture.distance = Math.max(0, dy)
    if (event.cancelable) event.preventDefault()
    const image = root()
    const background = overlay()
    const progress = Math.min(gesture.distance / 500, 1)
    if (image) {
      image.style.transition = 'none'
      image.style.transform = `translate3d(0, ${gesture.distance}px, 0) scale(${1 - progress * 0.12})`
    }
    if (background) {
      background.style.transition = 'none'
      background.style.opacity = String(1 - progress * 0.7)
      // Vant 默认淡出关键帧从 1 开始，需保存手势结束时的起始透明度。
      background.style.setProperty('--menu-preview-opacity', background.style.opacity)
    }
  }
  const end = (event) => {
    if (!gesture) return
    // 双指缩放结束时也会出现 touchend，不能把它当成关闭。
    const dismiss = event.touches.length === 0 && gesture.direction === 'down' && gesture.distance >= 110
    gesture = null
    if (dismiss) close()
    else reset()
  }
  const attach = () => {
    scale = 1
    cancel()
    if (attached) return
    attached = true
    doc.addEventListener('touchstart', start, {capture: true, passive: true})
    doc.addEventListener('touchmove', move, {capture: true, passive: false})
    doc.addEventListener('touchend', end, true)
    doc.addEventListener('touchcancel', cancel, true)
  }
  const dispose = () => {
    gesture = null
    attached = false
    doc.removeEventListener('touchstart', start, true)
    doc.removeEventListener('touchmove', move, true)
    doc.removeEventListener('touchend', end, true)
    doc.removeEventListener('touchcancel', cancel, true)
  }
  const onScale = (event) => {
    scale = event.scale
    if (Math.abs(scale - 1) > 0.01) cancel()
  }
  return {attach, dispose, onScale}
}
