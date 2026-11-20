import { useState } from 'react';
import apiClient from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import './AuthPages.css';

function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/users/login', formData);
      login(response.data.token, response.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      const backendMsg = err.response?.data?.msg;
      if (backendMsg) {
        setError(backendMsg);
      } else if (err.response) {
        setError(`登录失败（HTTP ${err.response.status}），请稍后重试`);
      } else {
        setError('无法连接后端服务，请确认后端已启动（http://localhost:3000）');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="登录你的学习空间"
      subtitle="继续记录每一次复述，让知识真正留下来。"
      footer={
        <>
          <p className="auth-switch">
            还没有账号？<Link to="/register">立即注册</Link>
          </p>
          <p className="auth-note">忘记密码？请联系课程管理员重置。</p>
        </>
      }
    >
      {error && (
        <div className="alert alert-error auth-alert" role="alert">
          {error}
        </div>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="login-email">
            邮箱
          </label>
          <input
            id="login-email"
            className="input"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="login-password">
            密码
          </label>
          <div className="input-wrap">
            <input
              id="login-password"
              className="input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="请输入密码"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="input-suffix"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block"
          disabled={isSubmitting}
        >
          {isSubmitting ? '登录中…' : '登录'}
        </button>
      </form>
    </AuthShell>
  );
}

export default LoginPage;
