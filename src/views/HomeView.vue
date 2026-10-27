<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { showImagePreview } from 'vant'
import 'vant/es/image-preview/style'
import '../imagePreview.css'
import sanityClient from '../sanityClient'
import { createDishImages } from '../dishImages'
import { createPageRefresh } from '../pageRefresh'
import { createImagePreview } from '../imagePreview'
import { createImagePreviewSwipe } from '../imagePreviewSwipe'

const getDishImages = createDishImages(sanityClient)

// 响应式状态
const allDishes = ref([])
const isLoading = ref(true)
const active = ref(0)
const categoryNav = ref(null)
const categoryElements = new Map()
const categoryButtons = new Map()
const categoryScrollLocked = ref(false)
let categoryScrollTimer
let lastCategoryClick = {index: -1, time: 0}
const wifi = ref({name: 'Apartamento 64', password: '66664444'})

const finishCategoryScroll = () => {
  window.clearTimeout(categoryScrollTimer)
  categoryScrollLocked.value = false
}
const revealCategory = (index) => {
  const nav = categoryNav.value
  const group = groupedMenu.value[index]
  const button = group && categoryButtons.get(group.categoryId)
  if (!nav || !button) return
  nav.scrollTo({
    left: Math.max(0, button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
const onCategoryPageScroll = () => {
  if (categoryScrollLocked.value) {
    window.clearTimeout(categoryScrollTimer)
    categoryScrollTimer = window.setTimeout(finishCategoryScroll, 160)
    return
  }
  const navHeight = categoryNav.value?.getBoundingClientRect().height || 56
  let index = 0
  groupedMenu.value.forEach((group, candidate) => {
    if (categoryElements.get(group.categoryId)?.getBoundingClientRect().top <= navHeight + 2) index = candidate
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
  if (lastCategoryClick.index === index && (
    categoryScrollLocked.value || now - lastCategoryClick.time < 400
  )) return false
  lastCategoryClick = {index, time: now}
  finishCategoryScroll()
  active.value = index
  categoryScrollLocked.value = true
  revealCategory(index)
  const navHeight = categoryNav.value?.getBoundingClientRect().height || 56
  // 多留 1px，避免小数像素使位置跟随误选前一个分类。
  const top = Math.max(0, Math.ceil(window.scrollY + target.getBoundingClientRect().top - navHeight) + 1)
  window.scrollTo({
    top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
  // 无滚动发生时也会解锁；滚动期间由 scroll 事件延后到停止后解锁。
  categoryScrollTimer = window.setTimeout(finishCategoryScroll, 1000)
}
const onCategoryScrollEnd = (event) => {
  if (event.target === document || event.target === window) finishCategoryScroll()
}

const formatPrice = (priceInfo) => {
  if (priceInfo?.priceType === 'market') return '时价'

  const amount = priceInfo?.amount
  if (priceInfo?.priceType === 'fixed' && Number.isFinite(amount) && amount >= 0) {
    return amount.toFixed(2)
  }

  return '价格待确认'
}

// 按分类 ID 归组，不依赖同一分类的菜品连续出现。
const groupedMenu = computed(() => {
  const groups = new Map()

  allDishes.value.forEach((dish) => {
    // 确保菜品有关联的分类
    if (!dish.category?._id) return

    if (!groups.has(dish.category._id)) {
      groups.set(dish.category._id, {
        categoryId: dish.category._id,
        categoryName: dish.category.name,
        dishes: [],
      })
    }

    groups.get(dish.category._id).dishes.push(dish)
  })

  return Array.from(groups.values())
})

const loadRestaurantSettings = async (signal) => {
  try {
    const settings = await sanityClient.fetch(
      '*[_type == "restaurantSettings" && _id == "restaurantSettings"][0]{wifiName, wifiPassword}',
      {},
      {perspective: 'published', signal},
    )
    // 尚未发布或配置不完整时，沿用现有 Wi-Fi 信息。
    if (!signal.aborted && typeof settings?.wifiName === 'string' && settings.wifiName.trim()) {
      wifi.value = {
        name: settings.wifiName,
        password: typeof settings.wifiPassword === 'string' && settings.wifiPassword !== ''
          ? settings.wifiPassword
          : '无需密码',
      }
    }
  } catch (error) {
    if (!signal.aborted) console.error('Failed to fetch restaurant settings:', error)
  }
}

const loadDishes = async (signal) => {
  try {
    const query = `*[_type == "dish" && status == 0 ] | order(defined(category->sortOrder) desc, category->sortOrder asc, category->_createdAt asc, category->_id asc, defined(sortOrder) desc, sortOrder asc, coalesce(sortAddedAt, _createdAt) asc, _id asc) {
      _id,
      name,
      priceInfo,
      description,
      imageFilename,
      photo{asset, crop, hotspot},
      category->{
        _id,
        name
      }
    }`
    const dishes = await sanityClient.fetch(query, {}, {perspective: 'published', signal})
    if (!signal.aborted) {
      allDishes.value = dishes.map((dish) => ({ ...dish, images: getDishImages(dish) }))
    }
  } catch (error) {
    if (!signal.aborted) console.error('Failed to fetch dishes:', error)
  } finally {
    if (!signal.aborted) isLoading.value = false
  }
}

const pageRefresh = createPageRefresh(async (signal) => {
  // 两项独立读取；后台刷新时不清空内容、不恢复整页加载状态。
  await Promise.all([loadRestaurantSettings(signal), loadDishes(signal)])
})

onMounted(() => {
  pageRefresh.start()
  window.addEventListener('scroll', onCategoryPageScroll, {passive: true})
  window.addEventListener('scrollend', onCategoryScrollEnd)
})
onUnmounted(() => pageRefresh.stop())
onUnmounted(() => {
  finishCategoryScroll()
  window.removeEventListener('scroll', onCategoryPageScroll)
  window.removeEventListener('scrollend', onCategoryScrollEnd)
})

const previewHintVisible = ref(false)
const imagePreview = createImagePreview(showImagePreview, createImagePreviewSwipe, (visible) => {
  previewHintVisible.value = visible
})
onUnmounted(() => imagePreview.dispose())

const openImagePreview = (dish) => {
  // 安全检查，如果菜品没有图片，则不执行任何操作
  if (!dish?.images?.preview) {
    return
  }

  imagePreview.open(dish.images.preview)
}
</script>

<template>
  <main>
    <div class="menu-list-container">
      <div class="wifi-info-section">
        <van-cell-group inset>
          <van-cell title="Wi-Fi 名称" :value="wifi.name" />
          <van-cell title="Wi-Fi 密码" :value="wifi.password" />
        </van-cell-group>
      </div>
      <div v-if="isLoading" class="lodaing-wrapper">
        <van-loading size="24px" vertical>加载中...</van-loading>
      </div>
      <div v-else>
        <nav ref="categoryNav" class="category-nav" aria-label="菜品分类">
          <button
            v-for="(group, index) in groupedMenu"
            :key="group.categoryId"
            :ref="el => el ? categoryButtons.set(group.categoryId, el) : categoryButtons.delete(group.categoryId)"
            type="button"
            :aria-current="active === index ? 'true' : undefined"
            :aria-controls="`category-${group.categoryId}`"
            @click="scrollToCategory(index)"
          >{{ group.categoryName }}</button>
        </nav>
        <template v-for="group in groupedMenu" :key="group.categoryId">
            <div
              :id="`category-${group.categoryId}`"
              :ref="el => el ? categoryElements.set(group.categoryId, el) : categoryElements.delete(group.categoryId)"
              class="dish-cards-wrapper"
            >
              <div class="category-heading">
                <h2>{{ group.categoryName }}</h2>
              </div>
              <div class="dish-card" v-for="dish in group.dishes" :key="dish._id">
                <van-image
                  v-if="dish.images.thumbnail"
                  lazy-load
                  :src="dish.images.thumbnail"
                  :alt="dish.name"
                  fit="cover"
                  class="dish-image"
                  radius="8px"
                  width="100%"
                  @click="openImagePreview(dish)"
                >
                  <template #loading>
                    <div class="dish-image-placeholder" role="status">
                      <van-loading size="24px" />
                      <span>图片加载中…</span>
                    </div>
                  </template>
                  <template #error>
                    <div class="dish-image-placeholder" role="status">
                      <van-icon name="photo-fail" size="32" aria-hidden="true" />
                      <span>图片暂时无法加载</span>
                    </div>
                  </template>
                </van-image>
                <div class="dish-details">
                  <div class="dish-title-row">
                    <h3 class="dish-name">{{ dish.name }}</h3>
                    <div class="dish-price">{{ formatPrice(dish.priceInfo) }}</div>
                  </div>
                  <p v-if="dish.description" class="dish-description">{{ dish.description }}</p>
                </div>
              </div>
            </div>
        </template>
      </div>
    </div>
  </main>
  <Teleport to="body">
    <div v-if="previewHintVisible" class="image-preview-hint">
      ↓ 下滑或轻点关闭
    </div>
  </Teleport>
</template>

<style scoped>
.image-preview-hint {
  position: fixed;
  z-index: 3000;
  left: 50%;
  bottom: calc(28px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  padding: 7px 14px;
  border-radius: 20px;
  color: rgb(255 255 255 / 80%);
  background: rgb(0 0 0 / 25%);
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
  pointer-events: none;
  animation: preview-hint-fade 2.4s ease-out forwards;
}

@keyframes preview-hint-fade {
  0% { opacity: 0; }
  10%, 83% { opacity: 1; }
  100% { opacity: 0; visibility: hidden; }
}

.menu-list-container {
  --menu-accent: #8d342c;
  --menu-ink: #29231f;
  --menu-muted: #756b61;
  --menu-line: #e2d9ce;
  --van-tabs-nav-background: #f8f5ef;
  --van-tabs-bottom-bar-color: var(--menu-accent);
  --van-tab-active-text-color: var(--menu-accent);
  --van-tab-text-color: var(--menu-muted);
  --van-tabs-line-height: 56px;
  --van-tab-font-size: 19px;
  max-width: 760px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f8f5ef;
  color: var(--menu-ink);
}
.wifi-info-section {
  --van-cell-group-inset-padding: 0;
  --van-cell-group-inset-radius: 10px;
  --van-cell-group-background: #f1ebe2;
  --van-cell-background: transparent;
  --van-cell-text-color: var(--menu-muted);
  --van-cell-value-color: #756b61;
  --van-cell-border-color: var(--menu-line);
  --van-cell-font-size: 17px;
  --van-cell-value-font-size: 20px;
  --van-cell-line-height: 28px;
  --van-cell-vertical-padding: 12px;
  padding: 16px 12px 8px;
}
.wifi-info-section :deep(.van-cell-group) {
  border: 1px solid var(--menu-line);
}
.wifi-info-section :deep(.van-cell) {
  align-items: baseline;
  gap: 12px;
}
.wifi-info-section :deep(.van-cell__title) {
  flex: 0 0 90px;
}
.wifi-info-section :deep(.van-cell__value) {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.category-nav {
  position: sticky;
  top: 0;
  z-index: 99;
  display: flex;
  height: 56px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  background: #f8f5ef;
  border-bottom: 1px solid var(--menu-line);
}
.category-nav::-webkit-scrollbar {
  display: none;
}
.category-nav button {
  position: relative;
  flex: 0 0 auto;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--menu-muted);
  font-size: 19px;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
}
.category-nav button[aria-current="true"] {
  color: var(--menu-accent);
  font-weight: 700;
}
.category-nav button[aria-current="true"]::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: calc(50% - 20px);
  width: 40px;
  height: 3px;
  background: var(--menu-accent);
}
.dish-cards-wrapper {
  padding: 0 12px;
}
.category-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 26px 4px 16px;
}
.category-heading::before,
.category-heading::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--menu-line);
}
.category-heading h2 {
  min-width: 0;
  text-align: center;
  overflow-wrap: anywhere;
  font-size: 18px;
  font-weight: 500;
  color: var(--menu-muted);
  letter-spacing: 1px;
  line-height: 1.4;
}
.dish-image {
  display: block;
  aspect-ratio: 4 / 3;
}
.dish-card:not(:last-child) {
  border-bottom: 1px solid var(--menu-line);
  padding-bottom: 22px;
}
.dish-card ~ .dish-card {
  padding-top: 22px;
}
.dish-details {
  padding: 12px 4px 4px;
}
.dish-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 16px;
}
.dish-name {
  flex: 1 1 180px;
  min-width: 0;
  font-size: 21px;
  font-weight: 500;
  line-height: 1.5;
  overflow-wrap: anywhere;
  color: #494039;
}
.dish-image-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: #eee8df;
  color: var(--menu-muted);
  font-size: 14px;
}
.dish-description {
  margin-top: 6px;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
  color: var(--menu-muted);
}
.dish-price {
  flex: 0 0 auto;
  margin-left: auto;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.5;
  color: #756b61;
  font-variant-numeric: tabular-nums;
}
.lodaing-wrapper {
  padding: 32px 0;
}
@media (min-width: 600px) {
  .wifi-info-section {
    padding: 20px 24px 8px;
  }
  .dish-cards-wrapper {
    padding: 0 24px;
  }
}
</style>
