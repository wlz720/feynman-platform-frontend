import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // 引入路由守卫
// 新增导入：知识点表单页面
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';
import KnowledgePointDetailPage from './pages/KnowledgePointDetailPage';
import FeynmanRecordPage from './pages/FeynmanRecordPage';
import QuizPage from './pages/QuizPage';
import QuizHistoryPage from './pages/QuizHistoryPage';
import AgentPage from './pages/AgentPage';
import GraphPage from './pages/GraphPage';
import ThreeJSPage from './pages/ThreeJSPage';
import KnowledgeUniversePage from './pages/KnowledgeUniversePage';

// 课时14：Cesium 数字地球。Cesium 体积大，懒加载单独分包，不影响其他页面首屏
const GlobePage = lazy(() => import('./pages/GlobePage'));

function App() {
  return (
    <Routes>
      {/* 公开页面：独立全屏，不套用应用导航 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<Layout />}>
        {/* 受保护页面：必须登录才能访问 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          {/* 新增两条知识点路由 */}
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
          <Route path="/kp/edit/:id" element={<KnowledgePointFormPage />} />
          {/* 知识点详情：查看内容与上次复述评价 */}
          <Route path="/kp/:id" element={<KnowledgePointDetailPage />} />
          {/* 费曼复述录音页面，需要登录 */}
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
          {/* AI 出题测评页面 */}
          <Route path="/quiz/:id" element={<QuizPage />} />
          {/* 测评历史记录：按知识点查看全部作答与错题 */}
          <Route path="/quiz/:id/history" element={<QuizHistoryPage />} />
          {/* 课时11：AI 助手（RAG 私有知识库问答） */}
          <Route path="/agent" element={<AgentPage />} />
          {/* 课时12：知识图谱（ECharts 力导向图） */}
          <Route path="/graph" element={<GraphPage />} />
          {/* 课时13：3D 视界（Three.js 知识宇宙） */}
          <Route path="/3d-world" element={<ThreeJSPage />} />
          {/* 课时14：3D 知识宇宙（d3-force-3d 力导向布局 + 点击信息浮层） */}
          <Route path="/universe" element={<KnowledgeUniversePage />} />
          {/* 课时14：Cesium 知识地球（离线底图，懒加载） */}
          <Route
            path="/globe"
            element={(
              <Suspense fallback={<div className="page"><p className="page-subtitle">正在加载知识地球…</p></div>}>
                <GlobePage />
              </Suspense>
            )}
          />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
