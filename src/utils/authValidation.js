// 注册 / 登录 / 找回密码共用的前端校验规则，与后端 routes/users.js 保持一致。
// 前端校验负责体验（即时红字提示），后端仍会二次校验。

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^1[3-9]\d{9}$/;

export function normalizeAccount(account) {
  const v = String(account || '').trim();
  return v.includes('@') ? v.toLowerCase() : v;
}

// 用户名：必填，2–20 字符
export function usernameError(username) {
  const v = String(username || '').trim();
  if (!v) return '请输入用户名';
  if (v.length < 2 || v.length > 20) return '用户名长度需为 2–20 个字符';
  return '';
}

// 邮箱：必填，符合格式
export function emailError(email) {
  const v = String(email || '').trim();
  if (!v) return '请输入邮箱地址';
  if (!EMAIL_RE.test(v)) return '请输入正确的邮箱地址';
  return '';
}

// 手机号：选填，填了才校验 11 位号段
export function phoneError(phone) {
  const v = String(phone || '').trim();
  if (!v) return '';
  if (!PHONE_RE.test(v)) return '请输入正确的 11 位手机号';
  return '';
}

// 密码：至少 6 位，不能全是同一个字符
export function passwordError(password) {
  const v = String(password || '');
  if (!v) return '请输入密码';
  if (v.length < 6) return '密码长度至少 6 位';
  if (v.length >= 2 && new Set(v.split('')).size === 1) return '密码不能由同一个字符重复组成';
  return '';
}

export function confirmPasswordError(password, confirmPassword) {
  if (String(password || '') !== String(confirmPassword || '')) return '两次输入的密码不一致';
  return '';
}

// 登录账号：邮箱或手机号，二选一
export function accountError(account) {
  const v = String(account || '').trim();
  if (!v) return '请输入邮箱或手机号';
  if (v.includes('@')) {
    if (!EMAIL_RE.test(v)) return '请输入正确的邮箱地址';
  } else if (!PHONE_RE.test(v)) {
    return '请输入正确的 11 位手机号';
  }
  return '';
}
