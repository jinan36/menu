export default {
  name: 'restaurantSettings',
  title: '餐厅设置',
  type: 'document',
  description: '在这里维护顾客菜单中的 Wi-Fi 信息。修改后点击发布生效。',
  fields: [
    {
      name: 'wifiName',
      title: 'Wi-Fi 名称',
      type: 'string',
      description: '填写顾客可连接的网络名称，将公开显示在菜单顶部。',
      validation: (Rule) => Rule.required().custom((value) =>
        typeof value === 'string' && !value.trim() ? '请填写有效的 Wi-Fi 名称' : true),
    },
    {
      name: 'wifiPassword',
      title: 'Wi-Fi 密码',
      type: 'string',
      description: '将公开显示给顾客。无需密码时留空，前台显示“无需密码”。',
    },
  ],
  preview: {
    select: {wifiName: 'wifiName'},
    prepare({wifiName}) {
      return {title: '餐厅设置', subtitle: wifiName ? `Wi-Fi：${wifiName}` : '配置顾客 Wi-Fi 信息'}
    },
  },
}
