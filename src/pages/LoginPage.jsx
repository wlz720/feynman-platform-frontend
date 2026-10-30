import { useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/users/login', formData);
      login(response.data.token, response.data.user);
      alert('登录成功！');
      navigate('/');
    } catch (err) {
      // 优先读取后端返回msg，没有才兜底
      setError(err.response?.data?.msg || '登录失败，请检查邮箱和密码');
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
        <h1 style={{ textAlign: 'center', color: '#5b21b6', marginBottom: '28px' }}>用户登录</h1>
        <form onSubmit={handleSubmit}>
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
          <div style={{ marginBottom: '12px' }}>
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
          {/* 新增忘记密码，放在密码框下方 */}
          <div style={{textAlign:'right', marginBottom:'24px'}}>
            <span
              style={{
                color:'#8b5cf6',
                cursor:'pointer',
                fontSize:'14px'
              }}
              onClick={()=>{
                alert('重置密码功能将在后续课时开发！');
              }}
            >忘记密码？</span>
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
            登录
          </button>
        </form>
        {error && <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '20px' }}>{error}</p>}
      </div>
    </div>
  );
}
export default LoginPage;
