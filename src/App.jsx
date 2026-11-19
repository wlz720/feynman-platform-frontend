import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // 引入路由守卫
// 新增导入：知识点表单页面
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';
import KnowledgePointDetailPage from './pages/KnowledgePointDetailPage';
import FeynmanRecordPage from './pages/FeynmanRecordPage';
import QuizPage from './pages/QuizPage';
import AgentPage from './pages/AgentPage';
import GraphPage from './pages/GraphPage';

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
          {/* 知识点详情：查看内容与上次复述评价 */}
          <Route path="/kp/:id" element={<KnowledgePointDetailPage />} />
          {/* 费曼复述录音页面，需要登录 */}
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
          {/* AI 出题测评页面 */}
          <Route path="/quiz/:id" element={<QuizPage />} />
          {/* 课时11：AI 助手（RAG 私有知识库问答） */}
          <Route path="/agent" element={<AgentPage />} />
          {/* 课时12：知识图谱（ECharts 力导向图） */}
          <Route path="/graph" element={<GraphPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
