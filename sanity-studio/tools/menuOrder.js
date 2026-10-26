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
    return a.id.localeCompare(b.id)
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

export function orderPatches(items) {
  return items.flatMap((item, index) =>
    item.versions.map((document) => ({
      id: document._id,
      revision: document._rev,
      sortOrder: index + 1,
    })),
  )
}
