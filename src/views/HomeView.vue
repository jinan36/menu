<script setup>
import { ref, onMounted, computed } from 'vue'
import { showImagePreview } from 'vant'
import 'vant/es/image-preview/style'
import sanityClient from '../sanityClient'
import { createDishImages } from '../dishImages'

const getDishImages = createDishImages(sanityClient)

// 响应式状态
const allDishes = ref([])
const isLoading = ref(true)
const active = ref(0)
const wifi = ref({name: 'Apartamento 64', password: '66664444'})

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

// 组件挂载后获取数据
onMounted(async () => {
  try {
    const settings = await sanityClient.fetch(
      '*[_type == "restaurantSettings" && _id == "restaurantSettings"][0]{wifiName, wifiPassword}',
      {},
      {perspective: 'published'},
    )
    // 尚未发布或配置不完整时，沿用现有 Wi-Fi 信息。
    if (typeof settings?.wifiName === 'string' && settings.wifiName.trim()) {
      wifi.value = {
        name: settings.wifiName,
        password: typeof settings.wifiPassword === 'string' && settings.wifiPassword !== ''
          ? settings.wifiPassword
          : '无需密码',
      }
    }
  } catch (error) {
    console.error('Failed to fetch restaurant settings:', error)
  }
})

onMounted(async () => {
  try {
    const query = `*[_type == "dish" && status == 0 ] | order(category->sortOrder asc, category->_id asc, sortOrder asc, _id asc) {
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
    const dishes = await sanityClient.fetch(query)
    allDishes.value = dishes.map((dish) => ({ ...dish, images: getDishImages(dish) }))
  } catch (error) {
    console.error('Failed to fetch dishes:', error)
  } finally {
    isLoading.value = false
  }
})

const openImagePreview = (dish) => {
  // 安全检查，如果菜品没有图片，则不执行任何操作
  if (!dish?.images?.preview) {
    return
  }

  // 构建完整的高清图片URL
  const imageUrl = dish.images.preview

  // 调用Vant的图片预览函数
  showImagePreview({
    images: [imageUrl], // 需要一个图片URL数组，即使只有一张
    startPosition: 0, // 从第一张图片开始（因为我们只有一个）
    closeable: true, // 显示关闭按钮
  })
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
        <van-tabs v-model:active="active" scrollspy sticky>
          <van-tab v-for="group in groupedMenu" :title="group.categoryName" :key="group.categoryId">
            <div class="dish-cards-wrapper">
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
          </van-tab>
        </van-tabs>
      </div>
    </div>
  </main>
</template>

<style scoped>
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
.menu-list-container :deep(.van-tabs__wrap) {
  border-bottom: 1px solid var(--menu-line);
}
.menu-list-container :deep(.van-tab--active .van-tab__text) {
  font-weight: 700;
}
.menu-list-container :deep(.van-tabs__line) {
  border-radius: 0;
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
  overflow-wrap: anywhere;
  color: var(--menu-muted);
}
.dish-price {
  flex: 0 0 auto;
  margin-left: auto;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--menu-accent);
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
