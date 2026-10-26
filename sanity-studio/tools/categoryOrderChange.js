// 只响应编辑表单本次发出的分类修改，不监听远程更新或在打开文档时写数据。
export function categoryChanged(category, patches) {
  const previous = category?._ref
  let exists = Boolean(category)
  let next = previous
  for (const patch of patches) {
    const path = patch.path || []
    if (path[0] !== 'category') continue
    if (path.length === 1) {
      if (patch.type === 'set' || (patch.type === 'setIfMissing' && !exists)) {
        exists = Boolean(patch.value)
        next = patch.value?._ref
      } else if (patch.type === 'unset') {
        exists = false
        next = undefined
      }
    } else if (path.length === 2 && path[1] === '_ref') {
      if (patch.type === 'set' || (patch.type === 'setIfMissing' && next === undefined)) next = patch.value
      else if (patch.type === 'unset') next = undefined
    }
  }
  return previous !== next
}
