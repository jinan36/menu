/* eslint-disable react/prop-types -- Layout props are supplied by Sanity Studio. */
import {useWorkspace} from 'sanity'

export default function EnvironmentLayout(props) {
  const {dataset} = useWorkspace()
  if (dataset === 'production') return props.renderDefault(props)

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div role="status" style={{
        flexShrink: 0, padding: '8px 16px', background: '#fff0c2', color: '#654600',
        textAlign: 'center', fontSize: 13, lineHeight: 1.5,
      }}>
        开发环境 · {dataset} · 编辑、发布和排序仅影响测试数据
      </div>
      <div style={{flex: 1, minHeight: 0, position: 'relative'}}>
        {props.renderDefault(props)}
      </div>
    </div>
  )
}
