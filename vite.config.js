import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    server: {
      proxy: {
        // 仅代理菜单读取接口，供同一 Wi-Fi 下的手机预览。
        [`/sanity-api/v2025-08-14/data/query/${env.VITE_SANITY_DATASET}`]: {
          target: `https://${env.VITE_SANITY_PROJECT_ID}.api.sanity.io`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sanity-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (request) => request.removeHeader('origin'))
          },
        },
      },
    },
    plugins: [
      vue(),
      vueDevTools(),
      AutoImport({
        resolvers: [VantResolver()],
      }),
      Components({
        resolvers: [VantResolver()],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
