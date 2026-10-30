import { useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [tip, setTip] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // 拿到登录方法
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTip('');
    try {
      // 第一步：注册
      await apiClient.post('/users/register', formData);
      setTip('注册成功，正在自动登录...');
      
      // 第二步：注册成功，立刻调用登录接口，拿到token和用户信息
      const loginRes = await apiClient.post('/users/login', {
        email: formData.email,
        password: formData.password
      });
      // 第三步：存入全局登录状态，直接跳主页
      login(loginRes.data.token, loginRes.data.user);
      navigate('/');
    } catch (err) {
      // 读取后端返回的msg，比如"邮箱已被注册"
      setError(err.response?.data?.msg || '注册失败');
    }
  };
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '70vh'
    }}>
      <div style={{
        width: '420px',
        padding: '36px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(139, 92, 246, 0.18)'
      }}>
        <h1 style={{ textAlign: 'center', color: '#5b21b6', marginBottom: '28px' }}>用户注册</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#4b5563' }}>用户名：</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                border: '1px solid #ddd6fe',
                borderRadius: '10px',
                fontSize: '15px',
                outlineColor: '#8b5cf6'
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#4b5563' }}>邮箱：</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                border: '1px solid #ddd6fe',
                borderRadius: '10px',
                fontSize: '15px',
                outlineColor: '#8b5cf6'
              }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#4b5563' }}>密码：</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                border: '1px solid #ddd6fe',
                borderRadius: '10px',
                fontSize: '15px',
                outlineColor: '#8b5cf6'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '13px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none' // 解决按钮点击闪烁光标
            }}
          >
            注册
          </button>
        </form>
        {tip && <p style={{ color: '#16a34a', textAlign: 'center', marginTop: '20px' }}>{tip}</p>}
        {error && <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
      </div>
    </div>
  );
}
export default RegisterPage;
