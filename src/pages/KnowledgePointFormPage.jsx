import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

function KnowledgePointFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id; // 有id就是编辑模式，没有就是新建

  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [originData, setOriginData] = useState({
    title: '',
    content: ''
  });

  // 如果是编辑，加载原来的数据
  useEffect(() => {
    if (isEdit) {
      const fetchKP = async () => {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setFormData({
          title: res.data.title,
          content: res.data.content
        });
        setOriginData({
          title: res.data.title,
          content: res.data.content
        });
      };
      fetchKP();
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEdit) {
      await apiClient.put(`/knowledge-points/${id}`, formData);
    } else {
      await apiClient.post('/knowledge-points', formData);
    }
    navigate('/');
  };

  // 取消逻辑：区分新建/编辑，对比原始数据
  const handleCancel = () => {
    const isChanged = formData.title !== originData.title || formData.content !== originData.content;
    if (isChanged) {
      if (isEdit) {
        if (window.confirm('确定放弃修改，退出编辑吗？未保存的改动会丢失！')) {
          navigate('/');
        }
      } else {
        if (window.confirm('确定放弃本次新建，退出吗？填写的内容会丢失！')) {
          navigate('/');
        }
      }
    } else {
      // 没有改动，直接返回主页，不弹窗
      navigate('/');
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>
      <h1 style={{ color: '#5b21b6' }}>
        {isEdit ? '编辑知识点' : '新建知识点'}
      </h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom:6, fontSize:15 }}>标题:</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #ddd6fe',
              fontSize:15
            }}
            required
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom:6, fontSize:15 }}>内容（支持输入Markdown文本）:</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={8}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #ddd6fe',
              fontSize:15
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding:'10px 20px',
              borderRadius:'8px',
              border:'1px solid #8b5cf6',
              background:'#fff',
              color:'#8b5cf6',
              cursor:'pointer',
              fontSize:'15px'
            }}
          >
            取消
          </button>
          <button
            type="submit"
            style={{
              padding:'10px 20px',
              borderRadius:'8px',
              border:'none',
              background:'#8b5cf6',
              color:'#fff',
              cursor:'pointer',
              fontSize:'15px'
            }}
          >
            {isEdit ? '更新' : '提交'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default KnowledgePointFormPage;