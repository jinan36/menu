// setInitialStatus.js

import {createClient} from '@sanity/client'

// 创建一个有写入权限的客户端
// 你需要一个有写入权限的token，可以在 https://www.sanity.io/manage/project/YOUR_PROJECT_ID/api#tokens 创建
// 强烈建议将 token 存储在 .env 文件中，而不是直接写在代码里
console.log(process.env.VITE_SANITY_PROJECT_ID)
const client = createClient({
  projectId: process.env.VITE_SANITY_PROJECT_ID,
  dataset: process.env.VITE_SANITY_DATASET,
  token: process.env.VITE_SANITY_TOKEN,
  useCdn: false, // 必须为 false 来获取最新数据
  apiVersion: '2025-08-14', // 使用一个较新的 API 版本
})

// 使用 GROQ 查询所有类型为 'product' 且 `status` 字段不存在的文档
const query = '*[_type == "dish" && !defined(status)] {_id}'

const main = async () => {
  console.log('正在查找缺少 "status" 字段的文档...')
  const documents = await client.fetch(query)

  if (!documents || documents.length === 0) {
    console.log('没有找到需要更新的文档。所有文档都已包含 "status" 字段。')
    return
  }

  console.log(`找到了 ${documents.length} 个需要更新的文档。`)

  // 创建一个事务来批量处理更新
  let transaction = client.transaction()

  documents.forEach((doc) => {
    console.log(`准备更新文档: ${doc._id}`)
    // 为每个文档设置 status 字段为 'published'
    transaction.patch(doc._id, {
      set: {status: 0},
    })
  })

  // 提交事务
  try {
    const result = await transaction.commit()
    console.log('批量更新成功！', result)
  } catch (error) {
    console.error('批量更新失败:', error.message)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
