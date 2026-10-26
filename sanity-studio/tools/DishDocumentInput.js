import {PatchEvent, set, unset} from 'sanity'
import {categoryChanged} from './categoryOrderChange.js'

export default function DishDocumentInput(props) {
  function handleChange(change) {
    const event = PatchEvent.from(change)
    const shouldReset = categoryChanged(props.value?.category, event.patches)
    // 分类和旧序号一起修改，避免异步监听误清除排序工具刚写入的序号。
    if (!shouldReset) { props.onChange(event); return }
    const reset = event.append(unset(['sortOrder']))
    // 首次选择分类沿用创建时间；改分类记录新时间，排在其他未排序菜品后面。
    props.onChange(props.value?.category?._ref || props.value?.sortAddedAt
      ? reset.append(set(new Date().toISOString(), ['sortAddedAt']))
      : reset)
  }
  return props.renderDefault({...props, onChange: handleChange})
}
