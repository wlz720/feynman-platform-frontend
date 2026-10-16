import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-layout">
      <nav style={{ background: '#eee', padding: '1rem' }}>
        {token ? (
          // 已登录：显示主页 + 退出登录
          <>
            <Link to="/" style={{ marginRight: '1rem' }}>主页</Link>
            <button onClick={handleLogout}>退出登录</button>
          </>
        ) : (
          // 未登录：显示登录 + 注册
          <>
            <Link to="/login" style={{ marginRight: '1rem' }}>登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}
      </nav>

      <main style={{ padding: '1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
