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
              <van-divider>{{ group.categoryName }}</van-divider>
              <div class="dish-card" v-for="dish in group.dishes" :key="dish._id">
                <van-image
                  v-if="dish.images.thumbnail"
                  lazy-load
                  :src="dish.images.thumbnail"
                  :alt="dish.name"
                  fit="cover"
                  class="dish-image"
                  radius="5px"
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
                <div class="dish-name">{{ dish.name }}</div>
                <div class="dish-description">{{ dish.description }}</div>
                <div class="dish-price">
                  {{ formatPrice(dish.priceInfo) }}
                </div>
              </div>
            </div>
          </van-tab>
        </van-tabs>
      </div>
    </div>
  </main>
</template>

<style>
.menu-list-container {
  min-height: 100vh;
}
.category-title {
  font-weight: bold;
  font-size: 20px;
}
.dish-cards-wrapper {
  padding: 0 12px;
}
.dish-image {
  display: block;
  aspect-ratio: 4 / 3;
}
.dish-card:not(:last-child) {
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.dish-card ~ .dish-card {
  padding-top: 16px;
}
.dish-name {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
  color: #333;
}
.dish-image-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: #f7f8fa;
  color: #969799;
  font-size: 14px;
}
.dish-description {
  font-size: 16px;
  color: #999;
}
.dish-price {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  color: #333;
}
.wifi-info-section {
  background-color: #f7f8fa;
  padding: 16px 0;
}
.lodaing-wrapper {
  padding: 12px 0;
}

.password-value {
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 让内容靠右对齐 */
  gap: 8px; /* 在密码和按钮之间增加一点间距 */
}
</style>
