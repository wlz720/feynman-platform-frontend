import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // 引入路由守卫
// 新增导入：知识点表单页面
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 公开页面：不用登录就能访问 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 受保护页面：必须登录才能访问 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          {/* 新增两条知识点路由 */}
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
          <Route path="/kp/edit/:id" element={<KnowledgePointFormPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;