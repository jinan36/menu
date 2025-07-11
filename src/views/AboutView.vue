<template>
  <ul>
    <li v-for="dish in dishes" :key="dish._id">
      <img :src="`${dish.imageFilename}`" :alt="dish.name" />
      <h3>{{ dish.name }}</h3>
      <p>R$ {{ dish.price }}</p>
    </li>
  </ul>
</template>
<script setup>
import sanityClient from '@/sanityClient'
import { ref, onMounted } from 'vue'

const dishes = ref([])

onMounted(async () => {
  const query = '*[_type == "dish"]' // GROQ 查询
  dishes.value = await sanityClient.fetch(query)
})
</script>
<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
