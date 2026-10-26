import assert from 'node:assert/strict'
import test from 'node:test'
import {collectOrderDocuments, insertDraggedItem, orderPatches} from '../tools/menuOrder.js'
import {categoryChanged} from '../tools/categoryOrderChange.js'
import DishDocumentInput from '../tools/DishDocumentInput.js'

test('既有序号在前，未排序按创建时间排列，换分类的旧菜按加入时间排到末尾', () => {
  const documents = [
    {_id:'a',_createdAt:'2026-10-25T00:00:00Z'},
    {_id:'z',_createdAt:'2026-10-24T00:00:00Z'},
    {_id:'ranked',sortOrder:0,_createdAt:'2026-10-26T00:00:00Z'},
    {_id:'moved',_createdAt:'2025-01-01T00:00:00Z',sortAddedAt:'2026-10-26T00:00:00Z'},
  ]
  assert.deepEqual(collectOrderDocuments(documents).map(d=>d.id),['ranked','z','a','moved'])
  assert.equal(documents[0].sortOrder,undefined)
})

test('重复序号依次按时间与 ID 排列', () => {
  const documents = [
    {_id:'b',sortOrder:4.5,_createdAt:'2026-10-25T00:00:00Z'},
    {_id:'a',sortOrder:4.5,_createdAt:'2026-10-25T00:00:00Z'},
    {_id:'z',sortOrder:4.5,_createdAt:'2026-10-24T00:00:00Z'},
  ]
  assert.deepEqual(collectOrderDocuments(documents).map(d=>d.id),['z','a','b'])
})

test('只同步仍在同分类的草稿，跨分类草稿不继承旧序号', () => {
  const items = collectOrderDocuments([
    {_id:'a',_rev:'a1',categoryId:'old',sortOrder:1},
    {_id:'drafts.a',_rev:'a2',categoryId:'new'},
    {_id:'b',_rev:'b1',categoryId:'old',sortOrder:2},
    {_id:'drafts.b',_rev:'b2',categoryId:'old',sortOrder:2},
  ])
  const patches = orderPatches(items)
  assert.deepEqual(patches.map(p=>p.id),['a','b','drafts.b'])
  assert.ok(patches.every(p=>p.revision))
  assert.ok(patches.every(p=>Object.keys(p).sort().join(',')==='id,revision,sortOrder'))
})

test('分类正式版和草稿共用连续整数，不修改其他字段', () => {
  const items = collectOrderDocuments([
    {_id:'a',_rev:'a1',name:'正式名',sortOrder:4.5},
    {_id:'drafts.a',_rev:'a2',name:'未发布名',sortOrder:4.5},
    {_id:'b',_rev:'b1',sortOrder:10},
  ])
  assert.equal(items[0].document.name,'正式名')
  assert.deepEqual(orderPatches(items).map(p=>[p.id,p.sortOrder]),[['a',1],['drafts.a',1],['b',2]])
})

test('分类引用的整字段、嵌套及清除修改均可识别，其他编辑不清序号', () => {
  const category={_ref:'a',_type:'reference'}
  assert.ok(categoryChanged(category,[{type:'set',path:['category'],value:{_ref:'b'}}]))
  assert.ok(categoryChanged(category,[{type:'set',path:['category','_ref'],value:'b'}]))
  assert.ok(categoryChanged(category,[{type:'unset',path:['category']}]))
  assert.ok(categoryChanged(category,[{type:'unset',path:['category','_ref']}]))
  assert.ok(categoryChanged(undefined,[{type:'setIfMissing',path:['category'],value:{_ref:'b'}}]))
  assert.ok(!categoryChanged(category,[{type:'set',path:['name'],value:'新名字'}]))
  assert.ok(!categoryChanged(category,[{type:'set',path:['sortOrder'],value:3}]))
  assert.ok(!categoryChanged(category,[{type:'set',path:['category'],value:{_ref:'a'}}]))
  assert.ok(!categoryChanged(category,[{type:'setIfMissing',path:['category'],value:{_ref:'b'}}]))
  assert.ok(!categoryChanged(category,[{type:'unset',path:['category']},{type:'set',path:['category'],value:{_ref:'a'}}]))
})

test('拖拽的前后插入与首尾处理不会丢失菜品或修改源列表', () => {
  const items=['A','B','C','D'].map(id=>({id}))
  for(let from=0;from<4;from++) for(let gap=0;gap<=4;gap++) {
    const next=insertDraggedItem(items,items[from].id,gap)
    assert.equal(next.length,4)
    assert.equal(new Set(next.map(d=>d.id)).size,4)
    assert.equal(next[gap>from?gap-1:gap].id,items[from].id)
  }
  assert.deepEqual(items.map(d=>d.id),['A','B','C','D'])
  assert.equal(insertDraggedItem(items,'A',-1),items)
})

test('修改分类时同一批补丁清除序号并记录加入时间，普通编辑不改变排序', () => {
  let result
  const input=DishDocumentInput({
    value:{category:{_ref:'old'},sortOrder:3},
    onChange:(event)=>{result=event.patches},
    renderDefault:(props)=>props,
  })
  input.onChange([{type:'set',path:['category'],value:{_ref:'new'}}])
  assert.equal(result.length,3)
  assert.equal(result[1].type,'unset')
  assert.deepEqual(result[1].path,['sortOrder'])
  assert.equal(result[2].type,'set')
  assert.deepEqual(result[2].path,['sortAddedAt'])
  assert.ok(Number.isFinite(Date.parse(result[2].value)))
  input.onChange([{type:'set',path:['name'],value:'新菜名'}])
  assert.equal(result.length,1)
  const newInput=DishDocumentInput({value:{},onChange:(event)=>{result=event.patches},renderDefault:(props)=>props})
  newInput.onChange([{type:'set',path:['category'],value:{_ref:'new'}}])
  assert.equal(result.length,2)
  assert.equal(result[1].type,'unset')
})
