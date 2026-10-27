import assert from 'node:assert/strict'
import test from 'node:test'
import {createClient} from '@sanity/client'
import {createDishImages} from '../src/dishImages.js'

const photo = {
  asset: {_ref: 'image-cc84be33b6a6aa807c402b43083c72b3329e44cb-1536x1024-png'},
  crop: {left: 0.1, right: 0.1, top: 0, bottom: 0},
  hotspot: {x: 0.5, y: 0.5, width: 0.3, height: 0.3},
}

test('本地查询代理不会改变上传照片的 CDN 地址，保留数据集、裁剪及缩略图参数', () => {
  const client = createClient({
    projectId: 't3dj4nuv', dataset: 'development', apiVersion: '2025-08-14',
    apiHost: 'http://localhost:5173/sanity-api', useProjectHostname: false, useCdn: false,
  })
  const images = createDishImages(client)({photo})
  for (const value of Object.values(images)) {
    const url = new URL(value)
    assert.equal(url.origin, 'https://cdn.sanity.io')
    assert.match(url.pathname, /^\/images\/t3dj4nuv\/development\//)
    assert.equal(url.searchParams.get('auto'), 'format')
  }
  const thumbnail = new URL(images.thumbnail)
  assert.equal(thumbnail.searchParams.get('w'), '900')
  assert.equal(thumbnail.searchParams.get('h'), '675')
  assert.ok(thumbnail.searchParams.has('rect'))
  const preview = new URL(images.preview)
  assert.equal(preview.searchParams.get('w'), '2000')
  assert.equal(preview.searchParams.get('fit'), 'max')
})

test('正式数据集仍使用正式图片地址；外链和无效上传引用保留原有回退行为', () => {
  const getImages = createDishImages({projectId: 't3dj4nuv', dataset: 'production'})
  assert.match(getImages({photo}).thumbnail, /^https:\/\/cdn.sanity.io\/images\/t3dj4nuv\/production\//)
  const fallback = 'https://example.com/dish.jpg'
  assert.deepEqual(getImages({imageFilename: fallback}), {thumbnail: fallback, preview: fallback})
  assert.deepEqual(getImages({photo: {asset: {_ref: 'invalid'}}, imageFilename: fallback}), {
    thumbnail: fallback, preview: fallback,
  })
  assert.deepEqual(getImages({}), {thumbnail: '', preview: ''})
})
