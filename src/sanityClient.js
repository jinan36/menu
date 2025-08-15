import { createClient } from '@sanity/client'

export default createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID, // 可以在 sanity.config.js 或 manage.sanity.io 找到
  dataset: import.meta.env.VITE_SANITY_DATASET,
  useCdn: true, // `false` for fresh data
  apiVersion: '2025-08-14', // use a UTC date in YYYY-MM-DD format
})
