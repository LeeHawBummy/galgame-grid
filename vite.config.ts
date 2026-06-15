import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  server: {
    // 本地开发时把 /api 请求代理到 wrangler pages dev (functions)。
    // 启动顺序：先 `npm run dev:functions` (8787)，再 `npm run dev` (5173)。
    // 这样本地与生产共用同一份 functions/api 代码，搜索行为一致。
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [],
  },
})
