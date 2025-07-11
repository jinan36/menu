<script setup>
import { ref, onMounted, computed } from 'vue'
import sanityClient from '../sanityClient' // 引入您的 Sanity 客户端实例

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
      price,
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
</script>

<template>
  <main>
    <div class="menu-list-container">
      <van-loading v-if="isLoading" size="24px" vertical>加载中...</van-loading>

      <div v-else>
        <div v-for="group in groupedMenu" :key="group.categoryId">
          <van-sticky>
            <van-cell :title="group.categoryName" class="category-title" />
          </van-sticky>

          <van-card
            v-for="dish in group.dishes"
            :key="dish._id"
            :price="dish.price.toFixed(2)"
            :desc="dish.description"
            :title="dish.name"
            :thumb="`${dish.imageFilename}`"
            currency="R$"
            class="dish-card"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<style>
.menu-list-container {
  background-color: #f7f8fa;
}
.category-title {
  font-weight: bold;
  font-size: 16px;
  /* 如果需要，可以添加更多样式 */
}
.dish-card {
  /* Vant Card 默认背景是白色，如果需要可以取消 */
  --van-card-background-color: #ffffff;
  margin-top: 0; /* 取消卡片间的默认上边距，让列表更紧凑 */
}
.dish-card:not(:last-child) {
  border-bottom: 1px solid #f7f8fa; /* 给卡片之间加一个分隔线 */
}
</style>
