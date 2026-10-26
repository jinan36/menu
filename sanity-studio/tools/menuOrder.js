export function collectOrderDocuments(documents) {
  const dishes = new Map()
  for (const document of documents) {
    const id = document._id.replace(/^drafts\./, '')
    const entry = dishes.get(id) || {id, versions: []}
    entry.versions.push(document)
    // 已发布菜品按线上信息展示，草稿仅用于同步排序字段。
    if (!entry.document || !document._id.startsWith('drafts.')) entry.document = document
    dishes.set(id, entry)
  }
  return Array.from(dishes.values()).sort((a, b) => {
    const left = a.document.sortOrder
    const right = b.document.sortOrder
    const leftValid = Number.isFinite(left)
    const rightValid = Number.isFinite(right)
    if (leftValid !== rightValid) return leftValid ? -1 : 1
    if (leftValid && left !== right) return left - right
    // 无序号的新增项目排在末尾，按创建时间排列；同序号也使用相同次序。
    const leftCreated = a.document.sortAddedAt || a.document._createdAt || ''
    const rightCreated = b.document.sortAddedAt || b.document._createdAt || ''
    if (leftCreated !== rightCreated) return leftCreated < rightCreated ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

// 保留原入口，菜品与分类共用相同的草稿合并和排序规则。
export const collectDishes = collectOrderDocuments

export function moveDish(items, from, to) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const next = [...items]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}

// insertionIndex 表示移除前列表中的间隙：0 为最前，length 为最后。
export function insertDraggedItem(items, sourceId, insertionIndex) {
  const from = items.findIndex((item) => item.id === sourceId)
  if (from < 0 || !Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > items.length) return items
  const to = insertionIndex > from ? insertionIndex - 1 : insertionIndex
  if (to === from) return items
  return moveDish(items, from, to)
}

export function orderVersions(item) {
  // 分类已在草稿中更换时，不能把旧分类的序号写回新分类草稿。
  return item.versions.filter((document) => document.categoryId === item.document.categoryId)
}

export function orderPatches(items) {
  return items.flatMap((item, index) =>
    orderVersions(item).map((document) => ({
      id: document._id,
      revision: document._rev,
      sortOrder: index + 1,
    })),
  )
}
