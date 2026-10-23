import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function KnowledgePointFormPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // 如果是编辑模式，回显原有数据
  useEffect(() => {
    if (isEditing) {
      const loadKp = async () => {
        try {
          const res = await apiClient.get(`/knowledge-points/${id}`);
          setTitle(res.data.title);
          setContent(res.data.content);
        } catch (e) {
          console.error('读取知识点失败', e);
        }
      };
      loadKp();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const kpData = { title, content };
    try {
      if (isEditing) {
        await apiClient.put(`/knowledge-points/${id}`, kpData);
      } else {
        await apiClient.post('/knowledge-points', kpData);
      }
      navigate('/');
    } catch (error) {
      console.error('保存知识点失败', error);
    }
  };

  return (
    <div>
      <h1 style={{color:'#5b21b6'}}>{isEditing ? '编辑知识点' : '新建知识点'}</h1>
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom:'16px'}}>
          <label style={{display:'block',marginBottom:'6px'}}>标题:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '12px', boxSizing:'border-box',borderRadius:'8px',border:'1px solid #ddd6fe' }}
          />
        </div>
        <div style={{ marginBottom: '6rem' }}>
          <label style={{display:'block',marginBottom:'6px'}}>内容:</label>
          <ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '300px' }} />
        </div>
        <button
          type="submit"
          style={{
            background:'#8b5cf6',
            color:'white',
            border:'none',
            padding:'10px 22px',
            borderRadius:'8px',
            cursor:'pointer',
            fontSize:'16px'
          }}
        >
          {isEditing ? '更新' : '创建'}
        </button>
      </form>
    </div>
  );
}

export default KnowledgePointFormPage;