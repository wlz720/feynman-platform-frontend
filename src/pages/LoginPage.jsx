import { useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 引入全局认证Hook

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // 从全局状态获取登录方法

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/users/login', formData);
      // 调用全局登录方法，自动同步token和localStorage
      login(response.data.token);
      alert('登录成功！');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.msg || '登录失败，请检查邮箱和密码');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>用户登录</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ margin: '10px 0' }}>
          <label>邮箱：</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ margin: '10px 0' }}>
          <label>密码：</label>
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">登录</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;
