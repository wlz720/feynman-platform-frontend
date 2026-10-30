import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Link } from 'react-router-dom';
import MarkdownContent from '../components/MarkdownContent';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleDelete = async (id) => {
    if (window.confirm('你确定要删除这个知识点吗？')) {
      try {
        await apiClient.delete(`/knowledge-points/${id}`);
        setKnowledgePoints((prev) => prev.filter((kp) => kp._id !== id));
      } catch (error) {
        console.error('删除失败', error);
      }
    }
  };

  if (loading) return <p>加载中...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>
      <h1 style={{ color: '#5b21b6', marginBottom: 18 }}>我的知识点</h1>
      <Link to="/kp/new">
        <button
          style={{
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
          }}
        >
          + 新建知识点
        </button>
      </Link>
      <div style={{ marginTop: 28 }}>
        {knowledgePoints.length === 0 ? (
          <p style={{ color: '#6b7280' }}>你还没有知识点，快去创建一个吧！</p>
        ) : (
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {knowledgePoints.map((kp) => (
              <li key={kp._id} className={styles.kpCard}>
                <h2 style={{ margin: '0 0 6px 0', color: '#4c1d95', fontSize: 20 }}>
                  {kp.title}
                </h2>
                <p style={{ margin: '4px 0 12px 0', color: '#6b7280', fontSize: 14 }}>
                  状态: {kp.status}
                </p>
                <div className={styles.markdownBox}>
                  <MarkdownContent>{kp.content}</MarkdownContent>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                  <Link to={`/kp/edit/${kp._id}`}>
                    <button className={styles.btnEdit}>编辑</button>
                  </Link>
                  {/* 费曼复述录音跳转按钮 */}
                  <Link to={`/feynman/${kp._id}`}>
                    <button
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#10b981',
                        color: 'white',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      🎤开始复述
                    </button>
                  </Link>
                  <button className={styles.btnDelete} onClick={() => handleDelete(kp._id)}>
                    删除
                  </button>
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
