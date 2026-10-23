import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Link } from 'react-router-dom';

function DashboardPage() {
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 获取知识点列表
  useEffect(() => {
    const fetchKnowledgePoints = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/knowledge-points');
        setKnowledgePoints(response.data);
      } catch (err) {
        setError('获取知识点失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchKnowledgePoints();
  }, []);

  // 删除知识点函数
  const handleDelete = async (id) => {
    if (window.confirm('你确定要删除这个知识点吗？')) {
      try {
        await apiClient.delete(`/knowledge-points/${id}`);
        // 删除后更新本地列表，不用刷新页面
        setKnowledgePoints(knowledgePoints.filter(kp => kp._id !== id));
      } catch (error) {
        console.error('删除失败', error);
      }
    }
  };

  if (loading) return <p>加载中...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1 style={{color:'#5b21b6'}}>我的知识点</h1>
      <Link to="/kp/new">
        <button style={{
          background:'#8b5cf6',
          color:'white',
          border:'none',
          padding:'10px 18px',
          borderRadius:'8px',
          cursor:'pointer',
          fontSize:'15px'
        }}>+ 新建知识点</button>
      </Link>

      <div style={{ marginTop: '24px' }}>
        {knowledgePoints.length === 0 ? (
          <p>你还没有任何知识点，快去创建一个吧！</p>
        ) : (
          <ul style={{paddingLeft:0,listStyle:'none'}}>
            {knowledgePoints.map((kp) => (
              <li key={kp._id} style={{
                border: '1px solid #ddd6fe',
                margin: '12px 0',
                padding: '16px',
                borderRadius:'12px',
                boxShadow:'0 2px 8px rgba(139,92,246,0.1)'
              }}>
                <h2 style={{margin:'0 0 8px 0'}}>{kp.title}</h2>
                <p>状态: {kp.status}</p>
                <div style={{marginTop:10}}>
                  <Link to={`/kp/edit/${kp._id}`}>
                    <button style={{marginRight:'10px',padding:'6px 12px',borderRadius:'6px',border:'1px solid #8b5cf6',background:'#fff',color:'#8b5cf6',cursor:'pointer'}}>编辑</button>
                  </Link>
                  <button onClick={() => handleDelete(kp._id)} style={{padding:'6px 12px',background:'#ef4444',color:'#fff',border:'none',borderRadius:'6px',cursor:'pointer'}}>删除</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;