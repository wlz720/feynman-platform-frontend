// src/pages/LoginPage.jsx
import { useState } from 'react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('尝试登录', { email, password });
    // 下节课对接后端API
  };

  return (
    <div>
      <h1>用户登录</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>邮箱：</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入邮箱"
          />
        </div>
        <div style={{marginTop:'8px'}}>
          <label>密码：</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
          />
        </div>
        <div style={{marginTop:'12px'}}>
          <button type="submit">登录</button>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
