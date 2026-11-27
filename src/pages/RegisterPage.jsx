import { useState } from 'react';
import apiClient from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import {
  usernameError,
  phoneError,
  emailError,
  passwordError,
  confirmPasswordError
} from '../utils/authValidation';
import './AuthPages.css';

const EMPTY_ERRORS = {
  username: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: ''
};

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // 校验单个字段；confirmPassword 依赖 password，单独算
  const validateField = (name, data = formData) => {
    switch (name) {
      case 'username':
        return usernameError(data.username);
      case 'phone':
        return phoneError(data.phone);
      case 'email':
        return emailError(data.email);
      case 'password':
        return passwordError(data.password);
      case 'confirmPassword':
        return confirmPasswordError(data.password, data.confirmPassword);
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const next = { ...formData, [e.target.name]: e.target.value };
    setFormData(next);
    // 输入时即时重算该字段，改正后红字立刻消失
    setErrors((prev) => {
      const nextErrors = { ...prev, [e.target.name]: validateField(e.target.name, next) };
      // 密码改动后联动确认密码
      if (e.target.name === 'password') {
        nextErrors.confirmPassword = confirmPasswordError(next.password, next.confirmPassword);
      }
      return nextErrors;
    });
  };

  const handleBlur = (e) => {
    const name = e.target.name;
    setErrors((prev) => ({ ...prev, [name]: validateField(name) }));
  };

  const validateAll = () => {
    const nextErrors = {
      username: validateField('username'),
      phone: validateField('phone'),
      email: validateField('email'),
      password: validateField('password'),
      confirmPassword: validateField('confirmPassword')
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (!validateAll()) return; // 存在不合法项，不提交

    setIsSubmitting(true);
    let registered = false;
    try {
      const payload = {
        username: formData.username.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };
      await apiClient.post('/users/register', payload);
      registered = true;

      const loginRes = await apiClient.post('/users/login', {
        account: payload.email,
        password: payload.password
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
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="register-username">
            用户名<span className="required">*</span>
          </label>
          <input
            id="register-username"
            className="input"
            name="username"
            autoComplete="username"
            placeholder="怎么称呼你（2–20 个字符）"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="register-phone">
            手机号<span className="optional">（选填，便于找回密码）</span>
          </label>
          <input
            id="register-phone"
            className="input"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="11 位手机号，可留空"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.phone && <p className="field-error">{errors.phone}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="register-email">
            邮箱<span className="required">*</span>
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
            onBlur={handleBlur}
          />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="register-password">
            密码<span className="required">*</span>
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

        <div className="field">
          <label className="label" htmlFor="register-confirm">
            确认密码<span className="required">*</span>
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
            onBlur={handleBlur}
          />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
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
