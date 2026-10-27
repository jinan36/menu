<script setup>
defineProps({ dish: { type: Object, required: true } })
const emit = defineEmits(['preview'])
const formatPrice = (priceInfo) => {
  if (priceInfo?.priceType === 'market') return '时价'

  const amount = priceInfo?.amount
  if (priceInfo?.priceType === 'fixed' && Number.isFinite(amount) && amount >= 0) {
    return amount.toFixed(2)
  }

  return '价格待确认'
}
</script>

<template>
  <div class="dish-card">
    <van-image
      v-if="dish.images.thumbnail"
      lazy-load
      :src="dish.images.thumbnail"
      :alt="dish.name"
      fit="cover"
      class="dish-image"
      radius="8px"
      width="100%"
      @click="emit('preview', dish)"
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
</template>

<style scoped>
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
</style>
