<script setup>
import { ref } from 'vue'
defineProps({ groups: { type: Array, required: true }, active: { type: Number, required: true } })
const emit = defineEmits(['select'])
const element = ref(null)
const categoryButtons = new Map()
defineExpose({ element, getButton: (id) => categoryButtons.get(id) })
</script>

<template>
  <nav ref="element" class="category-nav" aria-label="菜品分类">
    <button
      v-for="(group, index) in groups"
      :key="group.categoryId"
      :ref="
        (el) =>
          el ? categoryButtons.set(group.categoryId, el) : categoryButtons.delete(group.categoryId)
      "
      type="button"
      :aria-current="active === index ? 'true' : undefined"
      :aria-controls="`category-${group.categoryId}`"
      @click="emit('select', index)"
    >
      {{ group.categoryName }}
    </button>
  </nav>
</template>

<style scoped>
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
.category-nav button[aria-current='true'] {
  color: var(--menu-accent);
  font-weight: 700;
}
.category-nav button[aria-current='true']::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: calc(50% - 20px);
  width: 40px;
  height: 3px;
  background: var(--menu-accent);
}
</style>
