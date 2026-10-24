import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'
import styled from 'styled-components'
import {collectOrderDocuments, moveDish, orderPatches} from './menuOrder'

const Page = styled.div`
  height: 100%; overflow: auto; background: var(--card-bg-color, #f6f7f9);
  color: var(--card-fg-color, #19212d);
  * { box-sizing: border-box; }
  button, select { font: inherit; }
  button { cursor: pointer; }
  button:disabled { opacity: .45; cursor: default; }
  button:focus-visible, select:focus-visible { outline: 3px solid #709eff; outline-offset: 2px; }
`
const Container = styled.div`max-width: 900px; margin: 0 auto; padding: 36px 24px 0;
  @media (max-width: 600px) { padding: 24px 12px 0; }
`
const Header = styled.header`
  h1 { font-size: 28px; margin: 8px 0 12px; }
  p { color: #788491; line-height: 1.7; margin: 0 0 24px; }
`
const Eyebrow = styled.div`color: #6176aa; font-size: 12px; letter-spacing: 2px; font-weight: 700;`
const Panel = styled.section`
  border: 1px solid #8994a32e; border-radius: 12px; padding: 20px; margin-bottom: 20px;
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 10px; }
  select { width: 100%; padding: 12px; border: 1px solid #8994a355; border-radius: 8px;
    background: var(--card-bg-color, white); color: inherit; }
`
const ListHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 24px 0 12px;
  h2 { font-size: 16px; margin: 0; }
  span { font-size: 12px; color: #788491; }
`
const Row = styled.li`
  display: flex; align-items: center; gap: 12px; padding: 14px 12px; margin-bottom: 8px;
  border: 1px solid #8994a333; border-radius: 10px; background: var(--card-bg-color, white);
  &[data-drop='true'] { border-color: #5279d8; box-shadow: 0 0 0 2px #5279d833; }
  @media (max-width: 600px) { gap: 8px; padding: 12px 8px; }
`
const Handle = styled.span`color: #8994a3; font-size: 22px; cursor: grab; user-select: none;`
const NumberLabel = styled.span`color: #8994a3; font-size: 13px; min-width: 22px; text-align: center;`
const Picture = styled.div`
  width: 52px; height: 52px; flex-shrink: 0; background: #8994a315; border-radius: 8px; overflow: hidden;
  display: grid; place-items: center; color: #8994a3; font-size: 12px;
  img { width: 100%; height: 100%; object-fit: cover; }
  @media (max-width: 600px) { width: 40px; height: 40px; }
`
const Info = styled.div`
  flex: 1; min-width: 0;
  strong { display: block; font-size: 15px; overflow-wrap: anywhere; }
  small { display: block; color: #788491; margin-top: 6px; font-size: 12px; }
`
const Badge = styled.span`
  display: inline-block; color: ${({$active}) => ($active ? '#32986a' : '#88919d')};
  margin-right: 8px;
`
const Button = styled.button`
  border: 1px solid #8994a344; background: transparent; color: inherit; border-radius: 8px;
  padding: 9px 14px; white-space: nowrap;
`
const Arrows = styled.div`display: flex; gap: 4px; button { padding: 8px 10px; }
  @media (max-width: 600px) { flex-direction: column; button { padding: 4px 10px; } }
`
const Footer = styled.footer`
  position: sticky; bottom: 0; display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 12px; padding: 18px 0; margin-top: 20px;
  border-top: 1px solid #8994a333; background: var(--card-bg-color, #f6f7f9);
  small { color: #788491; } div { display: flex; gap: 8px; }
`
const Save = styled(Button)`background: #3267d5; color: white; border-color: #3267d5;`
const ModeSwitch = styled.div`
  display: flex; gap: 6px; padding: 5px; margin-bottom: 20px;
  border: 1px solid #8994a333; border-radius: 10px;
  button { flex: 1; border: 0; }
  button[aria-pressed='true'] { background: #3267d5; color: white; }
`
const Notice = styled.div`
  padding: 14px 16px; margin: 12px 0; border-radius: 8px; font-size: 13px; line-height: 1.7;
  background: ${({$error}) => ($error ? '#e7464615' : '#5279d810')};
  border: 1px solid ${({$error}) => ($error ? '#e7464655' : '#5279d833')};
`

const query = `{
  "categories": *[_type == "category" && !(_id in path("versions.**"))]
    {_id, _rev, name, sortOrder},
  "dishes": *[_type == "dish" && !(_id in path("versions.**"))]
    {_id, _rev, name, sortOrder, status, imageFilename, "photoUrl": photo.asset->url, priceInfo, "categoryId": category._ref}
}`

export default function MenuOrderTool() {
  const studioClient = useClient({apiVersion: '2025-08-14'})
  const client = useMemo(() => studioClient.withConfig({useCdn: false, perspective: 'raw'}), [studioClient])
  const [data, setData] = useState({categories: [], dishes: []})
  const [categoryId, setCategoryId] = useState('')
  const [mode, setMode] = useState('dishes')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dropId, setDropId] = useState('')
  const dragId = useRef(null)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const request = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const result = await client.fetch(query)
      if (request !== requestId.current) return
      const categories = collectOrderDocuments(result.categories)
      const published = categories.filter((c) => c.versions.some((v) => !v._id.startsWith('drafts.')))
      setData({categories, dishes: collectOrderDocuments(result.dishes)})
      setCategoryId((current) => published.some((c) => c.id === current) ? current : published[0]?.id || '')
    } catch {
      if (request === requestId.current) setError('读取菜单失败，请检查网络和账号权限后重试。')
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [client])

  useEffect(() => {
    load()
    return () => { requestId.current += 1 }
  }, [load])

  const sortingCategories = mode === 'categories'
  const publishedCategories = data.categories.filter((c) => c.versions.some((v) => !v._id.startsWith('drafts.')))
  const original = useMemo(() => mode === 'categories'
    ? data.categories
    : data.dishes.filter((d) => d.document.categoryId === categoryId), [data, categoryId, mode])
  useEffect(() => { setItems(original) }, [original])
  const dirty = items.length === original.length && items.some((item, index) => item.id !== original[index]?.id)
  const needsNumbering = items.some((item, index) => item.versions.some((v) => v.sortOrder !== index + 1))
  const busy = loading || saving

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    globalThis.addEventListener('beforeunload', warn)
    return () => globalThis.removeEventListener('beforeunload', warn)
  }, [dirty])

  function move(from, to) {
    setItems((current) => moveDish(current, from, to))
    setMessage('')
  }

  async function save() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      let transaction = client.transaction()
      for (const patch of orderPatches(items)) {
        transaction = transaction.patch(patch.id, (p) => p.ifRevisionId(patch.revision).set({sortOrder: patch.sortOrder}))
      }
      await transaction.commit({visibility: 'sync'})
      setMessage(sortingCategories ? '分类排序已保存，已发布分类的顺序已更新。' : '排序已保存，已发布菜品的顺序已更新。')
      await load()
    } catch (err) {
      setError(err.statusCode === 409
        ? '保存未完成：有内容已被其他操作修改。请取消本次调整并刷新列表后重试。'
        : '保存未确认，请检查网络或编辑权限。可刷新列表核对服务器上的顺序。')
    } finally {
      setSaving(false)
    }
  }

  return <Page><Container>
    <Header>
      <Eyebrow>MENU / ORDER</Eyebrow>
      <h1>菜单排序</h1>
      <p>{sortingCategories ? '调整菜单分类的先后顺序，拖动分类或点击箭头即可。' : '把招牌菜放在前面。选择分类，拖动菜品或点击箭头调整顺序。'}</p>
    </Header>
    <ModeSwitch role="group" aria-label="排序范围">
      <Button aria-pressed={!sortingCategories} disabled={busy || dirty} onClick={() => { setMode('dishes'); setMessage(''); setError(''); dragId.current = null; setDropId('') }}>菜品排序</Button>
      <Button aria-pressed={sortingCategories} disabled={busy || dirty} onClick={() => { setMode('categories'); setMessage(''); setError(''); dragId.current = null; setDropId('') }}>分类排序</Button>
    </ModeSwitch>
    {!sortingCategories && <Panel>
      <label htmlFor="menu-category">选择菜品分类</label>
      <select id="menu-category" value={categoryId} disabled={busy || dirty} onChange={(e) => { setCategoryId(e.target.value); setMessage('') }}>
        {!publishedCategories.length && <option value="">暂无已发布分类</option>}
        {publishedCategories.map((c) => <option key={c.id} value={c.id}>{c.document.name || '未命名分类'}</option>)}
      </select>
    </Panel>}
    <Notice>{sortingCategories
      ? '保存后，分类自动编号为 1、2、3……，更新前台分类顺序。只修改分类排序，不改变分类内菜品顺序，也不会发布其他草稿内容。仅草稿的分类及没有上架菜品的分类不会出现在前台。'
      : '保存后，当前分类自动编号为 1、2、3……，并更新线上菜单顺序。仅修改排序字段，不会发布菜品的其他草稿内容。'}</Notice>
    {error && <Notice $error role="alert">{error}</Notice>}
    {message && <Notice role="status">{message}</Notice>}
    <ListHeader>
      <h2>{sortingCategories ? '全部分类' : data.categories.find((c) => c.id === categoryId)?.document.name || '菜品列表'} <span>· {items.length} {sortingCategories ? '个分类' : '道菜品'}</span></h2>
      <Button disabled={busy || dirty} onClick={load}>刷新列表</Button>
    </ListHeader>
    {loading ? <Notice role="status">正在加载菜单…</Notice> : <>
      {!items.length && <Notice>{sortingCategories ? '暂无分类，请先在 Category 中添加分类。' : '当前分类暂无菜品。请在 Dish 中添加菜品并关联已发布的分类。'}</Notice>}
      <ol style={{listStyle: 'none', padding: 0, margin: 0}} aria-label={sortingCategories ? '分类排序' : '菜品排序'}>
        {items.map((item, index) => {
          const dish = item.document
          const thumbnail = dish.photoUrl ? `${dish.photoUrl}?w=104&h=104&fit=crop&auto=format&q=75` : dish.imageFilename
          const draftOnly = item.versions.every((v) => v._id.startsWith('drafts.'))
          const price = dish.priceInfo?.priceType === 'market' ? '时价' :
            Number.isFinite(dish.priceInfo?.amount) && dish.priceInfo.amount >= 0 ? dish.priceInfo.amount.toFixed(2) : '价格待确认'
          return <Row key={item.id} draggable={!busy} data-drop={dropId === item.id}
            onDragStart={(e) => { dragId.current = item.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id) }}
            onDragOver={(e) => { if (!busy && dragId.current) { e.preventDefault(); setDropId(item.id) } }}
            onDragEnd={() => { dragId.current = null; setDropId('') }}
            onDrop={(e) => { e.preventDefault(); if (!busy && dragId.current) move(items.findIndex((d) => d.id === dragId.current), index); dragId.current = null; setDropId('') }}>
            <Handle aria-hidden="true">⠿</Handle><NumberLabel>{index + 1}</NumberLabel>
            {!sortingCategories && <Picture>{thumbnail ? <img src={thumbnail} alt="" loading="lazy" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none' }} /> : '无图'}</Picture>}
            <Info><strong>{dish.name || (sortingCategories ? '未命名分类' : '未命名菜品')}</strong><small>
              {sortingCategories ? <>
                <Badge $active={!draftOnly}>{draftOnly ? '仅草稿' : '已发布'}</Badge>
                {data.dishes.filter((d) => d.document.categoryId === item.id).length} 道菜品
                {!draftOnly && item.versions.length > 1 && ' · 有未发布草稿'}
              </> : <>
              <Badge $active={!draftOnly && dish.status === 0}>{draftOnly ? '仅草稿' : dish.status === 0 ? '上架' : '未上架'}</Badge>
              {price}{!draftOnly && item.versions.length > 1 && ' · 有未发布草稿'}
              </>}
            </small></Info>
            <Arrows>
              <Button aria-label={`上移${dish.name || '菜品'}`} title="上移" disabled={busy || index === 0} onClick={() => move(index, index - 1)}>↑</Button>
              <Button aria-label={`下移${dish.name || '菜品'}`} title="下移" disabled={busy || index === items.length - 1} onClick={() => move(index, index + 1)}>↓</Button>
            </Arrows>
          </Row>
        })}
      </ol>
    </>}
    <Footer>
      <small aria-live="polite">{dirty ? '有未保存的调整 · 保存或取消后可切换排序范围和分类' : needsNumbering ? '保存可整理为连续整数序号' : '当前顺序已保存'}</small>
      <div><Button disabled={busy || !dirty} onClick={() => { setItems(original); setMessage(''); setError('') }}>取消调整</Button>
        <Save disabled={busy || !items.length || (!dirty && !needsNumbering)} onClick={save}>{saving ? '正在保存…' : '保存排序'}</Save></div>
    </Footer>
  </Container></Page>
}
