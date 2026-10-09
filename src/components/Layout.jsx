// src/components/Layout.jsx
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="app-layout">
      <nav style={{ background: '#eeeeee', padding: '1rem' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>首页</Link>
        <Link to="/login" style={{ marginRight: '1rem' }}>登录</Link>
        <Link to="/register">注册</Link>
      </nav>
      <main style={{ padding: '1rem' }}>
        {/* Outlet：子路由页面在这里渲染显示 */}
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
