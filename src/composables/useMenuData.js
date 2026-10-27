import { ref, computed, onMounted, onUnmounted } from 'vue'
import { createDishImages } from '../dishImages'
import { createPageRefresh } from '../pageRefresh'

export function useMenuData(
  sanityClient,
  { refreshOptions, getDishImages = createDishImages(sanityClient) } = {},
) {
  const allDishes = ref([])
  const isLoading = ref(true)
  const wifi = ref({ name: 'Apartamento 64', password: '66664444' })

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
        { perspective: 'published', signal },
      )
      // 尚未发布或配置不完整时，沿用现有 Wi-Fi 信息。
      if (!signal.aborted && typeof settings?.wifiName === 'string' && settings.wifiName.trim()) {
        wifi.value = {
          name: settings.wifiName,
          password:
            typeof settings.wifiPassword === 'string' && settings.wifiPassword !== ''
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
      const dishes = await sanityClient.fetch(query, {}, { perspective: 'published', signal })
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
  }, refreshOptions)

  onMounted(() => pageRefresh.start())
  onUnmounted(() => pageRefresh.stop())
  return { allDishes, groupedMenu, isLoading, wifi }
}
