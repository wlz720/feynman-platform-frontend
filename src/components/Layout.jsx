import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8ff' }}>
      <nav style={{
        background: '#8b5cf6',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)'
      }}>
        <div>
          {token ? (
            <Link to="/" style={{
              color: '#fff',
              fontSize: '18px',
              fontWeight: '600',
              textDecoration: 'none'
            }}>主页</Link>
          ) : (
            <>
              <Link to="/login" style={{
                color: '#fff',
                fontSize: '16px',
                textDecoration: 'none',
                marginRight: '24px'
              }}>登录</Link>
              <Link to="/register" style={{
                color: '#fff',
                fontSize: '16px',
                textDecoration: 'none'
              }}>注册</Link>
            </>
          )}
        </div>

        {token && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#fff', fontSize: '16px' }}>欢迎，{user.username}</span>
            <button
              onClick={handleLogout}
              style={{
                border: '1px solid white',
                background: 'transparent',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              退出登录
            </button>
          </div>
        )}
      </nav>

      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;