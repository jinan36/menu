<script setup>
import { ref, onUnmounted } from 'vue'
import { showImagePreview } from 'vant'
import 'vant/es/image-preview/style'
import '../imagePreview.css'
import sanityClient from '../sanityClient'
import DishCard from '../components/DishCard.vue'
import CategoryNav from '../components/CategoryNav.vue'
import { useMenuData } from '../composables/useMenuData'
import { useCategoryNavigation } from '../composables/useCategoryNavigation'
import { createImagePreview } from '../imagePreview'
import { createImagePreviewSwipe } from '../imagePreviewSwipe'

const { groupedMenu, isLoading, wifi } = useMenuData(sanityClient)
const { active, categoryNav, setCategoryElement, scrollToCategory } =
  useCategoryNavigation(groupedMenu)

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
        <CategoryNav
          ref="categoryNav"
          :groups="groupedMenu"
          :active="active"
          @select="scrollToCategory"
        />
        <template v-for="group in groupedMenu" :key="group.categoryId">
          <div
            :id="`category-${group.categoryId}`"
            :ref="(el) => setCategoryElement(group.categoryId, el)"
            class="dish-cards-wrapper"
          >
            <div class="category-heading">
              <h2>{{ group.categoryName }}</h2>
            </div>
            <DishCard
              v-for="dish in group.dishes"
              :key="dish._id"
              :dish="dish"
              @preview="openImagePreview"
            />
          </div>
        </template>
      </div>
    </div>
  </main>
  <Teleport to="body">
    <div v-if="previewHintVisible" class="image-preview-hint">↓ 下滑或轻点关闭</div>
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
  0% {
    opacity: 0;
  }
  10%,
  83% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    visibility: hidden;
  }
}

.menu-list-container {
  --menu-accent: #8d342c;
  --menu-ink: #29231f;
  --menu-muted: #756b61;
  --menu-line: #e2d9ce;
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
