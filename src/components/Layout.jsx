import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AUTH_LINKS = [
  { to: '/', label: '主页', end: true },
  { to: '/agent', label: 'AI 助手' },
  { to: '/graph', label: '知识图谱' },
  { to: '/3d-world', label: '3D 视界' },
  { to: '/universe', label: '知识宇宙' },
  { to: '/globe', label: '知识地球' },
];

function Layout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-nav">
        <div className="nav-inner">
          <Link className="brand" to={token ? '/' : '/login'}>
            <span className="brand-mark">F</span>
            <span className="brand-text">
              <strong>费曼学习平台</strong>
              <small>FEYNMAN LEARNING LAB</small>
            </span>
          </Link>

          {token ? (
            <nav className="nav-links" aria-label="主导航">
              {AUTH_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          ) : (
            <nav className="nav-links" aria-label="账号导航">
              <NavLink
                to="/login"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                登录
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                注册
              </NavLink>
            </nav>
          )}

          {token && user && (
            <div className="nav-user">
              <span className="avatar" aria-hidden="true">
                {(user.username || 'U').slice(0, 1).toUpperCase()}
              </span>
              <span className="nav-user-name">{user.username}</span>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                退出
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>费曼学习平台 · 用输出倒逼输入</span>
        <span className="footer-dot">·</span>
        <span>React + Express + AI</span>
      </footer>
    </div>
  );
}

export default Layout;
