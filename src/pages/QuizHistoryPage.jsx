import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';
import styles from './QuizHistoryPage.module.css';

const TYPE_LABELS = {
  'single-choice': '单选题',
  'short-answer': '简答题',
};

const DIFFICULTY_LABELS = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  simple: '简单',
};

function formatDateTime(value) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scoreBadgeClass(score) {
  if (typeof score !== 'number') return 'badge badge-neutral';
  if (score >= 80) return 'badge badge-success';
  if (score >= 60) return 'badge badge-warning';
  return 'badge badge-danger';
}

function QuizHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kpTitle, setKpTitle] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [total, setTotal] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKpTitle(res.data.title);
      } catch (err) {
        console.error('获取知识点失败', err);
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
        const backendMsg = err.response?.data?.msg;
        setError(
          backendMsg ||
            (err.response
              ? `获取测评记录失败（HTTP ${err.response.status}）`
              : '无法连接后端服务，请确认后端已启动')
        );
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [id, onlyWrong, reloadKey]);

  const accuracy = total > 0 ? Math.round(((total - wrongCount) / total) * 100) : 0;

  return (
    <div className="page">
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate(`/kp/${id}`)}
      >
        ← 返回知识点详情
      </button>

      <div className="page-header">
        <div>
          <span className="eyebrow">QUIZ HISTORY</span>
          <h1 className="page-title">测评记录</h1>
          <p className="page-subtitle">
            {kpTitle ? `知识点：${kpTitle}` : '加载知识点…'}
          </p>
        </div>
        <Link to={`/quiz/${id}`} className="btn btn-primary">
          继续测评 →
        </Link>
      </div>

      <div className={styles.summaryGrid}>
        <div className="stat-card">
          <p className="stat-label">累计作答</p>
          <p className="stat-value">{total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">答错次数</p>
          <p className="stat-value danger">{wrongCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">正确率</p>
          <p className="stat-value success">{accuracy}%</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="筛选测评记录">
          <button
            type="button"
            className={onlyWrong ? '' : 'active'}
            onClick={() => setOnlyWrong(false)}
          >
            全部记录
          </button>
          <button
            type="button"
            className={onlyWrong ? 'active' : ''}
            onClick={() => setOnlyWrong(true)}
          >
            只看错题
          </button>
        </div>
        <span className="hint">
          {onlyWrong ? `显示 ${attempts.length} 道错题` : `显示 ${attempts.length} 条记录`}
        </span>
      </div>

      {loading && (
        <div className="card card-pad">
          <div className="loading-block">
            <span className="spinner" />
            正在加载测评记录…
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">测评记录加载失败</h3>
          <p className="empty-text">{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            重新加载
          </button>
        </div>
      )}

      {!loading && !error && attempts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">{onlyWrong ? '🎉' : '📝'}</div>
          <h3 className="empty-title">
            {onlyWrong ? '还没有错题记录' : '还没有测评记录'}
          </h3>
          <p className="empty-text">
            {onlyWrong
              ? '继续保持，错题会在这里集中出现，方便考前复盘。'
              : '去做一套 AI 出的题，答题结果会自动保存到这里。'}
          </p>
          <Link to={`/quiz/${id}`} className="btn btn-primary">
            去测评
          </Link>
        </div>
      )}

      {!loading &&
        !error &&
        attempts.map((attempt) => (
          <article
            key={attempt._id}
            className={`${styles.attemptCard} ${
              attempt.isCorrect ? styles.correct : styles.wrong
            }`}
          >
            <div className={styles.attemptHead}>
              <span
                className={`badge ${attempt.isCorrect ? 'badge-success' : 'badge-danger'}`}
              >
                {attempt.isCorrect ? '✓ 正确' : '✕ 错误'}
              </span>
              {typeof attempt.score === 'number' && (
                <span className={scoreBadgeClass(attempt.score)}>{attempt.score} 分</span>
              )}
              <span className="badge badge-brand">
                {TYPE_LABELS[attempt.type] || attempt.type}
              </span>
              <span className="badge badge-neutral">
                {DIFFICULTY_LABELS[attempt.difficulty] || attempt.difficulty}
              </span>
              <span className={styles.attemptTime}>{formatDateTime(attempt.createdAt)}</span>
            </div>

            <div className={styles.attemptQuestion}>
              <MarkdownContent>{attempt.question}</MarkdownContent>
            </div>

            {attempt.type === 'single-choice' ? (
              <>
                <div className={styles.options}>
                  {Object.entries(attempt.options || {}).map(([key, value]) => {
                    const isAnswer = key === attempt.correctAnswer;
                    const isPicked = key === attempt.studentAnswer;
                    return (
                      <div
                        key={key}
                        className={`${styles.option} ${
                          isAnswer ? styles.answer : isPicked ? styles.picked : ''
                        }`}
                      >
                        <span>
                          <strong>{key}.</strong> {value}
                        </span>
                        {isAnswer && <span className={styles.optionTag}>正确答案</span>}
                        {isPicked && !isAnswer && (
                          <span className={styles.optionTag}>你的选择</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {attempt.explanation && (
                  <p className={styles.explanation}>
                    <strong>解析：</strong>
                    {attempt.explanation}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className={styles.answerBlock}>
                  <span className={styles.answerLabel}>我的回答</span>
                  {attempt.studentAnswer || '（未作答）'}
                </div>

                {attempt.feedback?.matchedPoints?.length > 0 && (
                  <div className={styles.feedbackRow}>
                    <span className={`${styles.feedbackLabel} ${styles.success}`}>命中</span>
                    <span>{attempt.feedback.matchedPoints.join('；')}</span>
                  </div>
                )}
                {attempt.feedback?.beyondPoints?.length > 0 && (
                  <div className={styles.feedbackRow}>
                    <span className={`${styles.feedbackLabel} ${styles.info}`}>加分</span>
                    <span>正确但知识点未涵盖：{attempt.feedback.beyondPoints.join('；')}</span>
                  </div>
                )}
                {attempt.feedback?.issues?.length > 0 && (
                  <div className={styles.feedbackRow}>
                    <span className={`${styles.feedbackLabel} ${styles.warning}`}>补漏</span>
                    <span>{attempt.feedback.issues.join('；')}</span>
                  </div>
                )}
                {attempt.feedback?.explanation && (
                  <p className={styles.explanation}>
                    <strong>阅卷意见：</strong>
                    {attempt.feedback.explanation}
                  </p>
                )}
              </>
            )}
          </article>
        ))}
    </div>
  );
}

export default QuizHistoryPage;
