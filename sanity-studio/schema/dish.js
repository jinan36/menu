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
  ],
}
