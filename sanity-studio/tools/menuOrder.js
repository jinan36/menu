export function collectDishes(documents) {
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

export function moveDish(items, from, to) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const next = [...items]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
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
