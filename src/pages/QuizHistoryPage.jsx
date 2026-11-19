import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';

const btnBase = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid #c4b5fd',
  background: '#fff',
  color: '#5b21b6',
  cursor: 'pointer',
};

const TYPE_LABELS = {
  'single-choice': '单选题',
  'short-answer': '简答题',
};

function QuizHistoryPage() {
  const { id } = useParams();
  const [kpTitle, setKpTitle] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [total, setTotal] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKpTitle(res.data.title);
      } catch (err) {
        setError(err.response?.data?.msg || err.message || '获取知识点失败');
      }
    };
    fetchKp();
  }, [id]);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiClient.get('/quiz/attempts', {
          params: { knowledgePointId: id, limit: 100, onlyWrong },
        });
        setAttempts(res.data.attempts || []);
        setTotal(res.data.total || 0);
        setWrongCount(res.data.wrongCount || 0);
      } catch (err) {
        setError(err.response?.data?.msg || err.message || '获取测评记录失败');
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [id, onlyWrong]);

  return (
    <div style={{ maxWidth: 860, margin: '30px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Link to={`/kp/${id}`}>
          <button style={btnBase}>返回知识点详情</button>
        </Link>
        <Link to={`/quiz/${id}`}>
          <button style={{ ...btnBase, border: 'none', background: '#8b5cf6', color: '#fff' }}>
            继续测评
          </button>
        </Link>
      </div>

      <h1 style={{ color: '#5b21b6', marginBottom: 6 }}>测评记录：{kpTitle || '加载中...'}</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>
        共 {total} 次作答，其中答错 {wrongCount} 次。记录会一直保留，方便对照复习。
      </p>

      <div style={{ display: 'flex', gap: 10, margin: '16px 0 20px' }}>
        <button
          type="button"
          onClick={() => setOnlyWrong(false)}
          style={{
            ...btnBase,
            background: onlyWrong ? '#fff' : '#8b5cf6',
            color: onlyWrong ? '#5b21b6' : '#fff',
          }}
        >
          全部记录
        </button>
        <button
          type="button"
          onClick={() => setOnlyWrong(true)}
          style={{
            ...btnBase,
            background: onlyWrong ? '#8b5cf6' : '#fff',
            color: onlyWrong ? '#fff' : '#5b21b6',
          }}
        >
          只看错题
        </button>
      </div>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p>加载测评记录...</p>}

      {!loading && !error && attempts.length === 0 && (
        <p style={{ color: '#6b7280' }}>
          {onlyWrong ? '还没有错题记录，继续保持。' : '还没有测评记录，去出一套题试试吧。'}
        </p>
      )}

      {!loading &&
        attempts.map((attempt) => (
          <div
            key={attempt._id}
            style={{
              border: `1px solid ${attempt.isCorrect ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 16,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'center',
                color: '#6b7280',
                fontSize: 13,
              }}
            >
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: attempt.isCorrect ? '#f0fdf4' : '#fef2f2',
                  color: attempt.isCorrect ? '#15803d' : '#b91c1c',
                  fontWeight: 600,
                }}
              >
                {attempt.isCorrect ? '正确' : '错误'}
              </span>
              {typeof attempt.score === 'number' && (
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    color: attempt.score >= 80 ? '#15803d' : attempt.score >= 60 ? '#b45309' : '#b91c1c',
                    fontWeight: 600,
                  }}
                >
                  {attempt.score} 分
                </span>
              )}
              <span>{TYPE_LABELS[attempt.type] || attempt.type}</span>
              <span>·</span>
              <span>{attempt.difficulty}</span>
              <span>·</span>
              <span>{attempt.createdAt ? new Date(attempt.createdAt).toLocaleString('zh-CN') : '未知时间'}</span>
            </div>

            <div style={{ fontSize: 16, fontWeight: 600, color: '#3b0764', margin: '10px 0' }}>
              <MarkdownContent>{attempt.question}</MarkdownContent>
            </div>

            {attempt.type === 'single-choice' ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(attempt.options || {}).map(([key, value]) => {
                    const isAnswer = key === attempt.correctAnswer;
                    const isPicked = key === attempt.studentAnswer;
                    return (
                      <div
                        key={key}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 8,
                          background: isAnswer ? '#f0fdf4' : isPicked ? '#fef2f2' : '#fff',
                          border: `1px solid ${isAnswer ? '#86efac' : isPicked ? '#fca5a5' : '#e5e7eb'}`,
                          lineHeight: 1.6,
                        }}
                      >
                        {key}. {value}
                        {isAnswer && <strong style={{ color: '#15803d' }}>（正确答案）</strong>}
                        {isPicked && !isAnswer && <strong style={{ color: '#b91c1c' }}>（你的选择）</strong>}
                      </div>
                    );
                  })}
                </div>
                {attempt.explanation && (
                  <p style={{ color: '#4b5563', lineHeight: 1.7, marginBottom: 0 }}>
                    <strong>解析：</strong>
                    {attempt.explanation}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div style={{ color: '#374151', fontWeight: 600, marginBottom: 6 }}>我的回答</div>
                <div
                  style={{
                    background: '#f9fafb',
                    padding: '10px 12px',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                    marginBottom: 10,
                  }}
                >
                  {attempt.studentAnswer}
                </div>

                {attempt.feedback?.matchedPoints?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ color: '#15803d' }}>符合知识点：</strong>
                    <span>{attempt.feedback.matchedPoints.join('；')}</span>
                  </div>
                )}
                {attempt.feedback?.beyondPoints?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ color: '#1d4ed8' }}>正确但知识点未涵盖：</strong>
                    <span>{attempt.feedback.beyondPoints.join('；')}</span>
                  </div>
                )}
                {attempt.feedback?.issues?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ color: '#b45309' }}>需要修正或补充：</strong>
                    <span>{attempt.feedback.issues.join('；')}</span>
                  </div>
                )}
                {attempt.feedback?.explanation && (
                  <p style={{ color: '#4b5563', lineHeight: 1.7, marginBottom: 0 }}>
                    <strong>阅卷意见：</strong>
                    {attempt.feedback.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

export default QuizHistoryPage;
