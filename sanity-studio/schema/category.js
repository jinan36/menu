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
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      hidden: true,
      description: '由菜单排序工具统一管理。新增分类默认排在末尾。',
    },
  ],
}
