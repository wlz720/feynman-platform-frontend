import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// 课时15：PWA 改造
// VitePWA 会在 build 时生成 manifest.webmanifest 与 sw.js，
// 前者定义「安装到主屏」的名称/图标/主题色，后者负责离线缓存。
// 课时14：Cesium 需要 Workers/Assets/Widgets/ThirdParty 静态资源，
// 用 viteStaticCopy 复制到 /cesium/ 下（dev 与 build 都生效），完全离线可用。
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // stripBase: 4 去掉 node_modules/cesium/Build/Cesium 前缀，
        // 最终落到 dist/cesium/{Workers,Assets,Widgets,ThirdParty}
        { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'cesium', rename: { stripBase: 4 } },
        { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'cesium', rename: { stripBase: 4 } },
        { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'cesium', rename: { stripBase: 4 } },
        { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'cesium', rename: { stripBase: 4 } }
      ]
    }),
    VitePWA({
      registerType: 'autoUpdate',
      // Service Worker 在 main.jsx 里手动注册：Electron 的 file:// 环境不注册 SW
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        id: '/',
        name: '费曼学习平台',
        short_name: '费曼平台',
        description: '基于 AI 的个性化费曼学习平台：知识点管理、语音复述、AI 评分与 RAG 问答',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#7EC8E3',
        background_color: '#F6FBFD',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // 预缓存应用外壳（含按需拆分的 mermaid / katex 分包）
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Cesium 静态资源（瓦片/Worker 数以千计）不进预缓存，按需走网络/HTTP 缓存
        globIgnores: ['cesium/**'],
        // 主包约 2.3MB，默认 2MB 上限会漏缓存，调到 5MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // SPA 直接访问 /agent 等路径时回退到 index.html
        navigateFallback: '/index.html',
        // API 请求不参与回退，避免把后端接口当页面
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true
      }
    })
  ]
})
