import { useState } from 'react';
import apiClient from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import {
  accountError,
  passwordError,
  confirmPasswordError
} from '../utils/authValidation';
import './AuthPages.css';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('account'); // account -> reset
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({ account: '', code: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setNotice('');

    const accountErr = accountError(account);
    setErrors((prev) => ({ ...prev, account: accountErr }));
    if (accountErr) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/users/forgot-password/send-code', { account: account.trim() });
      setStep('reset');
      setNotice('验证码已发送（演示模式：请查看后端控制台输出）');
    } catch (err) {
      setError(err.response?.data?.msg || '发送验证码失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setNotice('');

    const nextErrors = {
      account: accountError(account),
      code: code.trim() ? (/^\d{6}$/.test(code.trim()) ? '' : '请输入 6 位数字验证码') : '请输入验证码',
      password: passwordError(password),
      confirmPassword: confirmPasswordError(password, confirmPassword)
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/users/forgot-password/reset', {
        account: account.trim(),
        code: code.trim(),
        password,
        confirmPassword
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.msg || '重置密码失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="RESET PASSWORD"
      title="找回密码"
      subtitle="先获取验证码，再设置一个新密码。"
      footer={
        <p className="auth-switch">
          想起密码了？<Link to="/login">返回登录</Link>
        </p>
      }
    >
      {error && (
        <div className="alert alert-error auth-alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert auth-alert" role="status">
          {notice}
        </div>
      )}

      {step === 'account' ? (
        <form className="auth-form" onSubmit={sendCode} noValidate>
          <div className="field">
            <label className="label" htmlFor="fp-account">
              已注册的邮箱或手机号
            </label>
            <input
              id="fp-account"
              className="input"
              type="text"
              autoComplete="username"
              placeholder="you@example.com 或 11 位手机号"
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                setErrors((prev) => ({ ...prev, account: '' }));
              }}
              onBlur={() => setErrors((prev) => ({ ...prev, account: accountError(account) }))}
            />
            {errors.account && <p className="field-error">{errors.account}</p>}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? '发送中…' : '获取验证码'}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={resetPassword} noValidate>
          <div className="field">
            <label className="label" htmlFor="fp-account-readonly">
              账号
            </label>
            <input id="fp-account-readonly" className="input" type="text" value={account} readOnly />
          </div>

          <div className="field">
            <label className="label" htmlFor="fp-code">
              验证码
            </label>
            <input
              id="fp-code"
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="6 位数字验证码"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErrors((prev) => ({ ...prev, code: '' }));
              }}
            />
            {errors.code && <p className="field-error">{errors.code}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="fp-password">
              新密码
            </label>
            <div className="input-wrap">
              <input
                id="fp-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="至少 6 位字符"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: '', confirmPassword: '' }));
                }}
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
            <label className="label" htmlFor="fp-confirm">
              确认新密码
            </label>
            <input
              id="fp-confirm"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="再输入一次新密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
            />
            {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中…' : '重置密码'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default ForgotPasswordPage;
