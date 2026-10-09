// src/pages/RegisterPage.jsx
import { useState } from 'react';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('尝试注册', { username, email, password });
  };

  return (
    <div>
      <h1>用户注册</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>用户名：</label>
          <input
            type="text"
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            placeholder="请设置用户名"
          />
        </div>
        <div style={{marginTop:'8px'}}>
          <label>邮箱：</label>
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="请输入邮箱"
          />
        </div>
        <div style={{marginTop:'8px'}}>
          <label>密码：</label>
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="请设置密码"
          />
        </div>
        <div style={{marginTop:'12px'}}>
          <button type="submit">注册</button>
        </div>
      </form>
    </div>
  );
}

export default RegisterPage;
