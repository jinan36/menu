import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import MenuOrderTool from './tools/MenuOrderTool'

export default defineConfig({
  name: 'default',
  title: 'menu',

  projectId: 't3dj4nuv',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) => S.list().title('Content').items([
        ...S.documentTypeListItems().filter((item) => item.getId() !== 'restaurantSettings'),
        S.divider(),
        S.listItem().id('restaurant-settings').title('餐厅设置').child(
          S.document().schemaType('restaurantSettings').documentId('restaurantSettings').title('餐厅设置'),
        ),
      ]),
    }),
    visionTool(),
  ],
  tools: [{name: 'menu-order', title: '菜单排序', component: MenuOrderTool}],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => template.schemaType !== 'restaurantSettings'),
  },
  document: {
    newDocumentOptions: (options) => options.filter((option) => option.templateId !== 'restaurantSettings'),
    actions: (actions, context) => context.schemaType === 'restaurantSettings'
      ? actions.filter(({action}) => ['publish', 'discardChanges', 'restore'].includes(action))
      : actions,
  },
})
