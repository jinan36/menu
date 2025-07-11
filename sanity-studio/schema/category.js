export default {
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Category Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
    },
    {
      // 可以用这个字段来控制分类在菜单上的显示顺序
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: '数字越小，排序越靠前。可用于将招牌菜排在前面。',
    },
  ],
}
