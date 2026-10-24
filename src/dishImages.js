import { createImageUrlBuilder } from '@sanity/image-url'

// 只转换上传到 Sanity 的照片，原有外链地址保持原样。
export function createDishImages(config) {
  const builder = createImageUrlBuilder(config)
  return (dish) => {
    const fallback = typeof dish?.imageFilename === 'string' ? dish.imageFilename : ''
    if (dish?.photo?.asset?._ref) {
      try {
        return {
          thumbnail: builder.image(dish.photo).width(900).height(600).fit('crop').auto('format').quality(75).url(),
          preview: builder.image(dish.photo).width(2000).fit('max').auto('format').quality(85).url(),
        }
      } catch {
        // 无效的图片引用不能影响整个菜单渲染。
      }
    }
    return {thumbnail: fallback, preview: fallback}
  }
}
