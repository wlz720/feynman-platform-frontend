import { useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 输入框内容同步到状态
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 提交注册
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // 清空之前的错误
    try {
      // 调用后端注册接口
      await apiClient.post('/users/register', formData);
      alert('注册成功！即将跳转到登录页');
      // 注册成功自动跳转到登录页面
      navigate('/login');
    } catch (err) {
      // 显示后端返回的错误信息
      setError(err.response?.data?.msg || '注册失败，请稍后再试');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>用户注册</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ margin: '10px 0' }}>
          <label>用户名：</label>
          <input
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
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
        <button type="submit">注册</button>
      </form>
      {/* 错误提示文字，红色显示 */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default RegisterPage;
