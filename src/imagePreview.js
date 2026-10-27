export function createImagePreview(showPreview, createSwipe, onVisibilityChange = () => {}) {
  let session = null

  const dispose = () => {
    const previous = session
    session = null
    onVisibilityChange(false)
    previous?.swipe.dispose()
    previous?.instance?.close()
  }

  const open = (imageUrl) => {
    if (session || !imageUrl) return
    const current = {instance: null}
    current.swipe = createSwipe(() => current.instance?.close())
    session = current
    const onClose = () => {
      current.swipe.dispose()
      if (session === current) {
        session = null
        onVisibilityChange(false)
      }
    }
    try {
      current.instance = showPreview({
        images: [imageUrl],
        startPosition: 0,
        closeable: false,
        showIndex: false,
        className: 'menu-image-preview',
        overlayClass: 'menu-image-preview-overlay',
        onScale: (event) => current.swipe.onScale(event),
        onClose,
      })
      current.swipe.attach()
      onVisibilityChange(true)
    } catch (error) {
      onClose()
      throw error
    }
  }

  return {open, dispose}
}
