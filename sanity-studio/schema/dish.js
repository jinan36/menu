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
      name: 'priceInfo', // 我们给它一个更描述性的名字
      title: '价格信息 (Price Information)',
      type: 'object',
      fields: [
        {
          name: 'priceType',
          title: '价格类型 (Price Type)',
          type: 'string',
          // 使用 options 提供选择，而不是手动输入
          options: {
            list: [
              {title: '固定价格 (Fixed Price)', value: 'fixed'},
              {title: '时价 (Market Price)', value: 'market'},
            ],
            // 使用 radio 布局更直观
            layout: 'radio',
          },
          // 默认选择“固定价格”
          initialValue: 'fixed',
        },
        {
          name: 'amount',
          title: '金额 (Amount)',
          type: 'number',
          // 这是最关键的部分：条件性隐藏
          // 只有当 priceType 的值是 'fixed' 时，这个字段才显示
          hidden: ({parent}) => parent?.priceType !== 'fixed',
        },
      ],
      validation: (Rule) =>
        Rule.custom((priceInfo) => {
          // 添加一个自定义验证规则，确保固定价格时金额已填写
          if (priceInfo?.priceType === 'fixed' && !priceInfo.amount) {
            return '固定价格类型必须填写金额'
          }
          return true
        }),
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
