import { useState } from 'react';
import apiClient from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { accountError, passwordError } from '../utils/authValidation';
import './AuthPages.css';

function LoginPage() {
  const [formData, setFormData] = useState({ account: '', password: '' });
  const [errors, setErrors] = useState({ account: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateField = (name, data = formData) => {
    if (name === 'account') return accountError(data.account);
    if (name === 'password') return passwordError(data.password);
    return '';
  };

  const handleChange = (e) => {
    const next = { ...formData, [e.target.name]: e.target.value };
    setFormData(next);
    setErrors((prev) => ({ ...prev, [e.target.name]: validateField(e.target.name, next) }));
  };

  const handleBlur = (e) => {
    setErrors((prev) => ({ ...prev, [e.target.name]: validateField(e.target.name) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    const nextErrors = {
      account: accountError(formData.account),
      password: passwordError(formData.password)
    };
    setErrors(nextErrors);
    if (nextErrors.account || nextErrors.password) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/users/login', {
        account: formData.account.trim(),
        password: formData.password
      });
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
          <p className="auth-switch">
            <Link to="/forgot-password">忘记密码？</Link>
          </p>
        </>
      }
    >
      {error && (
        <div className="alert alert-error auth-alert" role="alert">
          {error}
        </div>
      )}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="login-account">
            邮箱或手机号
          </label>
          <input
            id="login-account"
            className="input"
            name="account"
            type="text"
            autoComplete="username"
            placeholder="you@example.com 或 11 位手机号"
            value={formData.account}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.account && <p className="field-error">{errors.account}</p>}
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
              onBlur={handleBlur}
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
          {errors.password && <p className="field-error">{errors.password}</p>}
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
