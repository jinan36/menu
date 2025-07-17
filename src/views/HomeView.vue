<script setup>
import { ref, onMounted, computed } from 'vue'
import sanityClient from '../sanityClient'

// 响应式状态
const allDishes = ref([])
const isLoading = ref(true)

// 使用 computed 属性来处理数据分组，这是核心！
const groupedMenu = computed(() => {
  if (allDishes.value.length === 0) {
    return []
  }

  const groups = []
  let currentGroup = null
  //test

  allDishes.value.forEach((dish) => {
    // 确保菜品有关联的分类
    if (!dish.category) return

    // 如果是新的分类，或者第一个分类
    if (!currentGroup || currentGroup.categoryId !== dish.category._id) {
      currentGroup = {
        categoryId: dish.category._id,
        categoryName: dish.category.name,
        dishes: [],
      }
      groups.push(currentGroup)
    }

    // 将当前菜品添加到当前分组中
    currentGroup.dishes.push(dish)
  })

  return groups
})

// 组件挂载后获取数据
onMounted(async () => {
  try {
    const query = `*[_type == "dish"] | order(category->sortOrder asc, sortOrder asc) {
      _id,
      name,
      priceInfo,
      description,
      imageFilename,
      category->{
        _id,
        name
      }
    }`
    allDishes.value = await sanityClient.fetch(query)
  } catch (error) {
    console.error('Failed to fetch dishes:', error)
  } finally {
    isLoading.value = false
  }
})

const openImagePreview = (dish) => {
  console.log(dish)
  // 安全检查，如果菜品没有图片，则不执行任何操作
  if (!dish || !dish.imageFilename) {
    return
  }

  // 构建完整的高清图片URL
  const imageUrl = `${dish.imageFilename}`

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
          <van-cell title="Wi-Fi 名称" value="Apartamento 64" />
          <van-cell title="Wi-Fi 密码" value="66664444"></van-cell>
        </van-cell-group>
      </div>

      <van-loading v-if="isLoading" size="24px" vertical>加载中...</van-loading>

      <div v-else>
        <div v-for="group in groupedMenu" :key="group.categoryId">
          <van-sticky>
            <van-cell :title="group.categoryName" class="category-title" />
          </van-sticky>

          <van-card
            v-for="dish in group.dishes"
            :key="dish._id"
            :desc="dish.description"
            :title="dish.name"
            :thumb="`${dish.imageFilename}`"
            class="dish-card"
            @click="openImagePreview(dish)"
          >
            <template #price>
              <div class="dish-price">
                <span v-if="dish.priceInfo && dish.priceInfo.priceType === 'fixed'">
                  {{ dish.priceInfo.amount.toFixed(2) }}
                </span>
                <span v-else> 时价 </span>
              </div>
            </template>
          </van-card>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
.menu-list-container {
  background-color: #f7f8fa;
  min-height: 100vh;
}
.category-title {
  font-weight: bold;
  font-size: 16px;
  /* 如果需要，可以添加更多样式 */
}
.dish-card {
  margin-top: 0; /* 取消卡片间的默认上边距，让列表更紧凑 */
}
.dish-card:not(:last-child) {
  border-bottom: 1px solid #ffffff; /* 给卡片之间加一个分隔线 */
}

.wifi-info-section {
  margin: 16px 0;
}

.password-value {
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 让内容靠右对齐 */
  gap: 8px; /* 在密码和按钮之间增加一点间距 */
}
</style>
