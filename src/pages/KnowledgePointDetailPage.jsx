import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';
import { STATUS_LABELS } from '../utils/kpStatus';
import styles from './KnowledgePointDetailPage.module.css';

const STATUS_BADGE = {
  not_started: 'badge-neutral',
  need_review: 'badge-warning',
  mastered: 'badge-success',
};

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KnowledgePointDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kp, setKp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchKp = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get(`/knowledge-points/${id}`);
      setKp(res.data);
    } catch (err) {
      setError(
        err.response?.data?.msg ||
          (err.response
            ? `加载知识点失败（HTTP ${err.response.status}）`
            : '无法连接后端服务，请确认后端已启动')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="card card-pad">
          <div className="loading-block">
            <span className="spinner" />
            正在加载知识点…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">知识点加载失败</h3>
          <p className="empty-text">{error}</p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={fetchKp}>
              重新加载
            </button>
            <Link to="/" className="btn btn-secondary">
              返回主页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!kp) return null;

  const attempt = kp.lastAttempt;
  const statusKey = kp.status || 'not_started';
  const ringColor =
    attempt?.score >= 80 ? '#3F9C81' : attempt?.score >= 60 ? '#35779C' : '#C36154';

  return (
    <div className="page">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/')}
        style={{ marginBottom: 12 }}
      >
        ← 返回知识点列表
      </button>

      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.badges}>
            <span className={`badge ${STATUS_BADGE[statusKey] || 'badge-neutral'}`}>
              {STATUS_LABELS[statusKey] || '未开始'}
            </span>
            {kp.reviewList && <span className="badge badge-danger">● 需复习</span>}
            {typeof attempt?.score === 'number' && (
              <span className="badge badge-brand">上次 {attempt.score} 分</span>
            )}
          </div>
          <h1 className={styles.title}>{kp.title}</h1>
          <p className={styles.meta}>
            {kp.createdAt ? `创建于 ${formatDateTime(kp.createdAt)}` : '知识点详情'}
            {attempt?.createdAt ? ` · 上次复述 ${formatDateTime(attempt.createdAt)}` : ''}
          </p>
          <div className={styles.actions}>
            <Link to={`/feynman/${kp._id}`} className="btn btn-success">
              🎙 开始复述
            </Link>
            <Link to={`/quiz/${kp._id}`} className="btn btn-primary">
              📝 开始测评
            </Link>
            <Link to={`/quiz/${kp._id}/history`} className="btn btn-secondary">
              测评记录
            </Link>
            <Link to={`/kp/edit/${kp._id}`} className="btn btn-secondary">
              ✎ 编辑
            </Link>
          </div>
        </div>
      </section>

      <section className={`card card-pad ${styles.contentCard}`}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className="section-title">知识点内容</h2>
            <p className="section-subtitle">你整理的核心概念与笔记。</p>
          </div>
          <span className={styles.sectionMeta}>{(kp.content || '').length} 字</span>
        </div>
        <div className={`markdown-body ${styles.contentBody}`}>
          <MarkdownContent>{kp.content || '（暂无内容）'}</MarkdownContent>
        </div>
      </section>

      <section className={`card card-pad ${styles.resultCard}`}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className="section-title">上次复述与 AI 评价</h2>
            <p className="section-subtitle">
              录音转写、AI 润色与评分都会保留，方便对比自己的表达变化。
            </p>
          </div>
          {attempt && (
            <Link to={`/feynman/${kp._id}`} className="btn btn-ghost btn-sm">
              再复述一次 →
            </Link>
          )}
        </div>

        {!attempt ? (
          <div className="empty-state" style={{ padding: '38px 20px' }}>
            <div className="empty-icon">🎙️</div>
            <h3 className="empty-title">还没有复述记录</h3>
            <p className="empty-text">
              录一段 1–3 分钟的口头复述，AI 会给出润色文本、评分和改进建议。
            </p>
            <Link to={`/feynman/${kp._id}`} className="btn btn-success">
              开始第一次复述
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.resultTop}>
              <div className={styles.scoreWrap}>
                <div
                  className="score-ring"
                  style={{ '--score': attempt.score, '--ring-color': ringColor }}
                >
                  <span className="score-ring-value">{attempt.score}</span>
                  <span className="score-ring-label">分 / 100</span>
                </div>
                <span className={styles.scoreCaption}>
                  {attempt.score >= 80
                    ? '讲得很清楚，保持住'
                    : attempt.score >= 60
                      ? '基本讲清，还能更具体'
                      : '建议回到原文补盲区'}
                </span>
              </div>
              <blockquote className={styles.evaluation}>
                {attempt.evaluation || '（AI 暂未给出综合评价）'}
              </blockquote>
            </div>

            <div className={styles.textGrid}>
              <div className={styles.textPanel}>
                <h3>我的复述原文</h3>
                <p className={`${styles.textBody} selectable`}>{attempt.transcribedText || '（无记录）'}</p>
              </div>
              <div className={styles.textPanel}>
                <h3>AI 润色后的文本</h3>
                <p className={`${styles.textBody} selectable`}>{attempt.polishedText || '（无记录）'}</p>
              </div>
            </div>

            {(attempt.strengths?.length > 0 || attempt.weaknesses?.length > 0) && (
              <div className={styles.lists}>
                {attempt.strengths?.length > 0 && (
                  <div className={`${styles.listCard} ${styles.success}`}>
                    <h3>优点 👍</h3>
                    <ul>
                      {attempt.strengths.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {attempt.weaknesses?.length > 0 && (
                  <div className={`${styles.listCard} ${styles.warning}`}>
                    <h3>待改进 👇</h3>
                    <ul>
                      {attempt.weaknesses.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default KnowledgePointDetailPage;
