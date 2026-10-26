import DishDocumentInput from '../tools/DishDocumentInput'

export default {
  name: 'dish',
  title: 'Dish',
  type: 'document',
  components: {input: DishDocumentInput},
  preview: {
    select: {
      title: 'name',
      status: 'status',
      category: 'category.name',
      priceType: 'priceInfo.priceType',
      amount: 'priceInfo.amount',
    },
    prepare({title, status, category, priceType, amount}) {
      const statusLabel = status === 0 ? '上架' : status === 1 ? '下架' : '状态未设置'
      const price = priceType === 'market'
        ? '时价'
        : priceType === 'fixed' && Number.isFinite(amount) && amount >= 0
          ? amount.toFixed(2)
          : '价格待确认'
      return {
        title: title || '未命名菜品',
        subtitle: `${statusLabel} · ${category || '未分类'} · ${price}`,
      }
    },
  },
  fields: [
    {
      name: 'name',
      title: '菜品名称',
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
      name: 'photo',
      title: '菜品照片',
      type: 'image',
      options: {hotspot: true, accept: 'image/jpeg,image/png,image/webp'},
      description: '上传自己拍摄的 JPG、PNG 或 WebP 照片，可调整裁剪和焦点。发布后优先显示此照片；未上传时使用下方的原图片链接。手机 HEIC 照片请先转成 JPG。',
    },
    {
      name: 'imageFilename',
      title: '原图片链接（备用）',
      type: 'string',
      description: '保留现有网络图片的完整地址。未上传菜品照片时使用；上传照片后无需删除此链接。',
    },
    {
      name: 'description',
      title: '描述',
      type: 'text',
    },
    {
      name: 'sortOrder',
      title: '排序',
      type: 'number',
      hidden: true,
      description: '由菜单排序工具统一管理。',
    },
    {
      name: 'sortAddedAt',
      title: '加入分类时间',
      type: 'datetime',
      hidden: true,
      description: '更换分类后自动记录，用于将尚未排序的菜品放在新分类末尾。',
    },
    {
      name: 'category',
      title: '分类',
      description: '新增或更换分类后，菜品默认排在该分类末尾。可在“菜单排序”中调整。',
      type: 'reference', // 类型是 reference
      to: [{type: 'category'}], // 指向 'category' 这个 document 类型
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'status',
      title: '上架状态',
      type: 'number',
      options: {
        list: [
          {title: '上架', value: 0},
          {title: '下架', value: 1},
        ],
      },
      initialValue: 0,
    },
  ],
}
