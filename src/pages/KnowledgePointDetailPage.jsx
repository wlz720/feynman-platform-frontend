import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';
import { STATUS_LABELS } from '../utils/kpStatus';

function KnowledgePointDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kp, setKp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKp = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKp(res.data);
      } catch (err) {
        setError(err.response?.data?.msg || err.message || '获取知识点失败');
      } finally {
        setLoading(false);
      }
    };
    fetchKp();
  }, [id]);

  if (loading) return <p style={{ padding: 20 }}>加载中...</p>;
  if (error) return <p style={{ padding: 20, color: '#dc2626' }}>{error}</p>;
  if (!kp) return null;

  const attempt = kp.lastAttempt;
  const scoreColor = attempt?.score >= 80 ? '#16a34a' : attempt?.score >= 60 ? '#f59e0b' : '#dc2626';

  return (
    <div style={{ maxWidth: 860, margin: '30px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #aaa', background: '#fff' }}
        >
          返回仪表盘
        </button>
        <Link to={`/kp/edit/${kp._id}`}>
          <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #8b5cf6', background: '#fff', color: '#8b5cf6' }}>
            编辑
          </button>
        </Link>
        <Link to={`/feynman/${kp._id}`}>
          <button style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff' }}>
            🎤 开始复述
          </button>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ color: '#5b21b6', margin: 0 }}>{kp.title}</h1>
        {kp.reviewList && (
          <span style={{ padding: '3px 10px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c', fontSize: 13 }}>
            ● 需复习
          </span>
        )}
      </div>
      <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>
        状态：{STATUS_LABELS[kp.status] || kp.status}
        {attempt && (
          <>
            {'　|　上次得分：'}
            <strong style={{ color: scoreColor }}>{attempt.score}</strong>
            {'　|　复述时间：'}
            {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString('zh-CN') : '未知'}
          </>
        )}
      </p>

      <h2 style={{ color: '#4c1d95', fontSize: 20, marginTop: 26 }}>知识点内容</h2>
      <div
        style={{
          background: '#fbfaff',
          border: '1px solid #e9d5ff',
          borderRadius: 12,
          padding: '16px 22px',
          lineHeight: 1.75,
        }}
      >
        <MarkdownContent>{kp.content}</MarkdownContent>
      </div>

      <h2 style={{ color: '#4c1d95', fontSize: 20, marginTop: 30 }}>上次复述与 AI 评价</h2>

      {!attempt ? (
        <p style={{ color: '#6b7280' }}>
          还没有复述记录。点上方「🎤 开始复述」录一段，AI 会给出润色与评分。
        </p>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ color: '#4c1d95' }}>我的复述原文</h3>
              <p style={{ background: '#f9fafb', padding: '1rem', borderRadius: 10, whiteSpace: 'pre-wrap' }}>
                {attempt.transcribedText || '（无记录）'}
              </p>

              <h3 style={{ color: '#4c1d95' }}>AI 润色后的文本</h3>
              <p style={{ background: '#eef2ff', padding: '1rem', borderRadius: 10, whiteSpace: 'pre-wrap' }}>
                {attempt.polishedText || '（无记录）'}
              </p>

              <h3 style={{ color: '#4c1d95' }}>综合评价</h3>
              <p style={{ lineHeight: 1.7 }}>{attempt.evaluation || '（无记录）'}</p>

              {attempt.strengths?.length > 0 && (
                <>
                  <h3 style={{ color: '#4c1d95' }}>优点 👍</h3>
                  <ul style={{ lineHeight: 1.8 }}>
                    {attempt.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {attempt.weaknesses?.length > 0 && (
                <>
                  <h3 style={{ color: '#4c1d95' }}>待改进 👇</h3>
                  <ul style={{ lineHeight: 1.8 }}>
                    {attempt.weaknesses.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div style={{ flex: '0 0 150px', textAlign: 'center' }}>
              <h3 style={{ color: '#4c1d95' }}>上次得分</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: scoreColor }}>{attempt.score}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>/ 100</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgePointDetailPage;
