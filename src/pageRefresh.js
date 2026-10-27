// 只在用户返回页面时刷新，不轮询；同一轮请求覆盖同时到达的多个事件。
export function createPageRefresh(refresh, {
  page = document,
  view = window,
  now = Date.now,
  minIntervalMs = 30_000,
  onError = (error) => console.error('Failed to refresh menu:', error),
} = {}) {
  let started = false
  let lastRequestAt = null
  let inFlight = false
  let controller

  const run = async () => {
    if (!started || inFlight) return
    const time = now()
    if (lastRequestAt !== null && time - lastRequestAt < minIntervalMs) return

    lastRequestAt = time
    inFlight = true
    controller = new AbortController()
    const signal = controller.signal
    try {
      await refresh(signal)
    } catch (error) {
      if (!signal.aborted) onError(error)
    } finally {
      inFlight = false
    }
  }

  const onReturn = () => {
    if (page.visibilityState === 'visible') void run()
  }
  const onPageShow = (event) => {
    if (event.persisted) onReturn()
  }

  return {
    start() {
      if (started) return
      started = true
      page.addEventListener('visibilitychange', onReturn)
      view.addEventListener('focus', onReturn)
      view.addEventListener('pageshow', onPageShow)
      void run()
    },
    stop() {
      started = false
      page.removeEventListener('visibilitychange', onReturn)
      view.removeEventListener('focus', onReturn)
      view.removeEventListener('pageshow', onPageShow)
      controller?.abort()
    },
  }
}
