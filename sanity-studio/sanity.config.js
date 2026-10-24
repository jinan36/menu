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

  plugins: [structureTool(), visionTool()],
  tools: [{name: 'menu-order', title: '菜单排序', component: MenuOrderTool}],

  schema: {
    types: schemaTypes,
  },
})
