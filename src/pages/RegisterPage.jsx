import { useState } from 'react';
import apiClient from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import './AuthPages.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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

    const username = formData.username.trim();
    if (!username) {
      setError('请输入用户名');
      return;
    }
    if (formData.password.length < 6) {
      setError('密码至少需要 6 位字符');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致，请重新确认');
      return;
    }

    setIsSubmitting(true);
    let registered = false;
    try {
      await apiClient.post('/users/register', {
        username,
        email: formData.email.trim(),
        password: formData.password,
      });
      registered = true;

      const loginRes = await apiClient.post('/users/login', {
        email: formData.email.trim(),
        password: formData.password,
      });
      login(loginRes.data.token, loginRes.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      const backendMsg = err.response?.data?.msg;
      if (registered) {
        setError('注册成功，但自动登录失败，请前往登录页手动登录。');
      } else if (backendMsg) {
        setError(backendMsg);
      } else if (err.response) {
        setError(`注册失败（HTTP ${err.response.status}），请稍后重试`);
      } else {
        setError('无法连接后端服务，请确认后端已启动（http://localhost:3000）');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="CREATE ACCOUNT"
      title="创建你的学习账号"
      subtitle="三步开始：建知识点、录一段复述、让 AI 告诉你哪里没讲清。"
      footer={
        <p className="auth-switch">
          已经有账号？<Link to="/login">直接登录</Link>
        </p>
      }
    >
      {error && (
        <div className="alert alert-error auth-alert" role="alert">
          {error}
        </div>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="register-username">
            用户名
            <span className="required">*</span>
          </label>
          <input
            id="register-username"
            className="input"
            name="username"
            autoComplete="username"
            placeholder="怎么称呼你"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="register-email">
            邮箱
            <span className="required">*</span>
          </label>
          <input
            id="register-email"
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
          <label className="label" htmlFor="register-password">
            密码
            <span className="required">*</span>
          </label>
          <div className="input-wrap">
            <input
              id="register-password"
              className="input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="至少 6 位字符"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
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
        <div className="field">
          <label className="label" htmlFor="register-confirm">
            确认密码
            <span className="required">*</span>
          </label>
          <input
            id="register-confirm"
            className="input"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="再输入一次密码"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block"
          disabled={isSubmitting}
        >
          {isSubmitting ? '注册中…' : '注册并登录'}
        </button>
      </form>
    </AuthShell>
  );
}

export default RegisterPage;
