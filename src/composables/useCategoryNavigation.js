import { ref, onMounted, onUnmounted } from 'vue'

export function useCategoryNavigation(groupedMenu) {
  const active = ref(0)
  const categoryNav = ref(null)
  const categoryElements = new Map()
  const categoryScrollLocked = ref(false)
  let categoryScrollTimer
  let lastCategoryClick = { index: -1, time: 0 }

  const finishCategoryScroll = () => {
    window.clearTimeout(categoryScrollTimer)
    categoryScrollLocked.value = false
  }
  const revealCategory = (index) => {
    const nav = categoryNav.value?.element
    const group = groupedMenu.value[index]
    const button = group && categoryNav.value?.getButton(group.categoryId)
    if (!nav || !button) return
    nav.scrollTo({
      left: Math.max(0, button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }
  const onCategoryPageScroll = () => {
    if (categoryScrollLocked.value) {
      window.clearTimeout(categoryScrollTimer)
      categoryScrollTimer = window.setTimeout(finishCategoryScroll, 160)
      return
    }
    const navHeight = categoryNav.value?.element?.getBoundingClientRect().height || 56
    let index = 0
    groupedMenu.value.forEach((group, candidate) => {
      if (categoryElements.get(group.categoryId)?.getBoundingClientRect().top <= navHeight + 2)
        index = candidate
    })
    if (index !== active.value) {
      active.value = index
      revealCategory(index)
    }
  }

  // 点击后锁定目标，途经分类不改变导航；用户手动滚动时才跟随。
  const scrollToCategory = (index) => {
    const group = groupedMenu.value[index]
    const target = group && categoryElements.get(group.categoryId)
    if (!target) return false
    const now = Date.now()
    if (
      lastCategoryClick.index === index &&
      (categoryScrollLocked.value || now - lastCategoryClick.time < 400)
    )
      return false
    lastCategoryClick = { index, time: now }
    finishCategoryScroll()
    active.value = index
    categoryScrollLocked.value = true
    revealCategory(index)
    const navHeight = categoryNav.value?.element?.getBoundingClientRect().height || 56
    // 多留 1px，避免小数像素使位置跟随误选前一个分类。
    const top = Math.max(
      0,
      Math.ceil(window.scrollY + target.getBoundingClientRect().top - navHeight) + 1,
    )
    window.scrollTo({
      top,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
    // 无滚动发生时也会解锁；滚动期间由 scroll 事件延后到停止后解锁。
    categoryScrollTimer = window.setTimeout(finishCategoryScroll, 1000)
  }
  const onCategoryScrollEnd = (event) => {
    if (event.target === document || event.target === window) finishCategoryScroll()
  }

  const setCategoryElement = (id, element) => {
    if (element) categoryElements.set(id, element)
    else categoryElements.delete(id)
  }
  onMounted(() => {
    window.addEventListener('scroll', onCategoryPageScroll, { passive: true })
    window.addEventListener('scrollend', onCategoryScrollEnd)
  })
  onUnmounted(() => {
    finishCategoryScroll()
    window.removeEventListener('scroll', onCategoryPageScroll)
    window.removeEventListener('scrollend', onCategoryScrollEnd)
  })
  return { active, categoryNav, setCategoryElement, scrollToCategory }
}
