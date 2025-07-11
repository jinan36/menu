export default {
  name: 'dish',
  title: 'Dish',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Dish Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'price',
      title: 'Price',
      type: 'number',
    },
    {
      // 这里我们只存R2上的文件名，如 'brazilian-steak.jpg'
      name: 'imageFilename',
      title: 'Image Filename (from Cloudflare R2)',
      type: 'string',
      description: 'Just the filename, not the full URL.',
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
    },
    {
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: '数字越小，排序越靠前。可用于将招牌菜排在前面。',
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference', // 类型是 reference
      to: [{type: 'category'}], // 指向 'category' 这个 document 类型
      validation: (Rule) => Rule.required(),
    },
  ],
}
