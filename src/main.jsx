import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // 引入全局认证提供者

// 课时15：Electron 打包后用 file:// 加载页面，history 路由（/agent）会找不到文件，
// 因此 Electron 环境切到 HashRouter（/#/agent），浏览器环境仍用 BrowserRouter。
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

// PWA：仅在生产构建且运行在 http(s) 下注册 Service Worker；
// Electron 的 file:// 不支持 Service Worker，直接跳过，避免控制台报错。
if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  /^https?:$/.test(window.location.protocol)
) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      // 注册失败不影响应用正常使用
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      {/* 用AuthProvider包裹整个应用，所有页面都能用全局状态 */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>,
);
