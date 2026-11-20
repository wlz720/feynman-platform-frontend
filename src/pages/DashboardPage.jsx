import { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import MarkdownContent from '../components/MarkdownContent';
import { WindChime, Goldfish } from '../components/SummerDecor';
import { STATUS_LABELS } from '../utils/kpStatus';
import styles from './DashboardPage.module.css';

const STATUS_BADGE = {
  not_started: 'badge-neutral',
  need_review: 'badge-warning',
  mastered: 'badge-success',
};

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'need_review', label: '待复习' },
  { key: 'mastered', label: '已掌握' },
  { key: 'not_started', label: '未开始' },
];

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function scoreBadgeClass(score) {
  if (score >= 80) return 'badge badge-success';
  if (score >= 60) return 'badge badge-brand';
  return 'badge badge-danger';
}

function DashboardPage() {
  const navigate = useNavigate();
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const loadKnowledgePoints = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/knowledge-points');
      setKnowledgePoints(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error(err);
      setError(
        err.response
          ? `加载知识点失败（HTTP ${err.response.status}），请稍后重试`
          : '无法连接后端服务，请确认后端已启动（http://localhost:3000）'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgePoints();
  }, []);

  const stats = useMemo(() => {
    const total = knowledgePoints.length;
    const needReview = knowledgePoints.filter(
      (kp) => kp.reviewList || kp.status === 'need_review'
    ).length;
    const mastered = knowledgePoints.filter((kp) => kp.status === 'mastered').length;
    const notStarted = knowledgePoints.filter((kp) => kp.status === 'not_started').length;
    const scores = knowledgePoints
      .map((kp) => kp.lastAttempt?.score)
      .filter((score) => typeof score === 'number');
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;
    const maxScore = scores.length ? Math.max(...scores) : null;
    const masteryPct = total ? Math.round((mastered / total) * 100) : 0;
    return {
      total,
      needReview,
      mastered,
      notStarted,
      avgScore,
      maxScore,
      scoreCount: scores.length,
      masteryPct
    };
  }, [knowledgePoints]);

  const focusPoint = useMemo(() => {
    return (
      knowledgePoints
        .filter((kp) => kp.reviewList || kp.status === 'need_review')
        .sort((a, b) => (a.lastAttempt?.score ?? 101) - (b.lastAttempt?.score ?? 101))[0] || null
    );
  }, [knowledgePoints]);

  const filteredPoints = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return knowledgePoints.filter((kp) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'need_review' && (kp.reviewList || kp.status === 'need_review')) ||
        (filter === 'mastered' && kp.status === 'mastered') ||
        (filter === 'not_started' && kp.status === 'not_started');
      if (!matchesFilter) return false;
      if (!keyword) return true;
      return `${kp.title || ''} ${kp.content || ''}`.toLowerCase().includes(keyword);
    });
  }, [knowledgePoints, filter, query]);

  const handleDelete = async (kp) => {
    if (deletingId) return;
    const confirmed = window.confirm(`确定删除「${kp.title}」吗？删除后无法恢复。`);
    if (!confirmed) return;
    setActionError('');
    setDeletingId(kp._id);
    try {
      await apiClient.delete(`/knowledge-points/${kp._id}`);
      setKnowledgePoints((prev) => prev.filter((item) => item._id !== kp._id));
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.msg;
      setActionError(
        backendMsg
          ? `删除失败：${backendMsg}`
          : err.response
            ? `删除失败（HTTP ${err.response.status}），请稍后重试`
            : '删除失败：无法连接后端服务'
      );
    } finally {
      setDeletingId('');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card card-pad">
          <div className="loading-block">
            <span className="spinner" />
            正在加载你的知识点…
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
          <button type="button" className="btn btn-primary" onClick={loadKnowledgePoints}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <section className={styles.hero}>
        {/* 夏日点缀：风铃 + 金鱼，各一处，低透明度不抢内容 */}
        <WindChime className={styles.heroChime} />
        <Goldfish className={styles.heroFish} flip />
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>LEARNING DASHBOARD</span>
          <h1 className={styles.heroTitle}>我的知识点</h1>
          <p className={styles.heroSub}>
            把每一次复述都变成看得见的进步。先讲一遍，再让 AI 教练告诉你哪里还没讲清。
          </p>
          <div className={styles.heroActions}>
            <Link to="/kp/new" className={styles.btnHero}>
              + 新建知识点
            </Link>
            <Link to="/agent" className={styles.btnHeroGhost}>
              ✨ 问 AI 助手
            </Link>
          </div>
        </div>
        <div className={styles.heroMetrics}>
          <div className={styles.heroMetricRow}>
            <div className={styles.heroMetric}>
              <span className={styles.heroMetricValue}>{stats.total}</span>
              <span className={styles.heroMetricLabel}>知识点总数</span>
            </div>
            <div className={styles.heroMetricDivider} />
            <div className={styles.heroMetric}>
              <span className={styles.heroMetricValue}>{stats.mastered}</span>
              <span className={styles.heroMetricLabel}>已掌握</span>
            </div>
            <div className={styles.heroMetricDivider} />
            <div className={styles.heroMetric}>
              <span className={styles.heroMetricValue}>
                {stats.masteryPct}
                <span className={styles.heroMetricUnit}>%</span>
              </span>
              <span className={styles.heroMetricLabel}>整体掌握率</span>
            </div>
          </div>
          <div className={styles.heroProgress}>
            <div className={styles.heroProgressTrack}>
              <span
                className={styles.heroProgressFill}
                style={{ width: `${stats.masteryPct}%` }}
              />
            </div>
            <span className={styles.heroProgressLabel}>
              已掌握 {stats.mastered} / {stats.total} 个知识点
            </span>
          </div>
        </div>
      </section>

      {focusPoint && (
        <section className={styles.focusBar}>
          <span className={styles.focusIcon} aria-hidden="true">
            ↻
          </span>
          <div className={styles.focusCopy}>
            <span className={styles.focusEyebrow}>NEXT REVIEW</span>
            <strong className={styles.focusTitle}>下一步：先复习「{focusPoint.title}」</strong>
            <p className={styles.focusText}>
              {typeof focusPoint.lastAttempt?.score === 'number'
                ? `上次复述 ${focusPoint.lastAttempt.score} 分，建议再讲一遍，把没讲清的概念补上。`
                : '这个知识点还没有复述记录，先用自己的话讲一遍，让 AI 教练给出反馈。'}
            </p>
          </div>
          <Link to={`/feynman/${focusPoint._id}`} className={styles.focusAction}>
            去复述 →
          </Link>
        </section>
      )}

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className={styles.statHead}>
            <span className={`${styles.statIcon} ${styles.statIconReview}`} aria-hidden="true">
              ↻
            </span>
            <p className="stat-label">待复习</p>
          </div>
          <p className="stat-value danger">{stats.needReview}</p>
          <div className={styles.statMeter}>
            <span
              className={`${styles.statMeterFill} ${styles.meterWarm}`}
              style={{ width: `${stats.total ? (stats.needReview / stats.total) * 100 : 0}%` }}
            />
          </div>
          <p className={styles.statHint}>占全部知识点的 {stats.total ? Math.round((stats.needReview / stats.total) * 100) : 0}%</p>
        </div>
        <div className="stat-card">
          <div className={styles.statHead}>
            <span className={`${styles.statIcon} ${styles.statIconIdle}`} aria-hidden="true">
              ○
            </span>
            <p className="stat-label">未开始</p>
          </div>
          <p className="stat-value">{stats.notStarted}</p>
          <div className={styles.statMeter}>
            <span
              className={`${styles.statMeterFill} ${styles.meterCool}`}
              style={{ width: `${stats.total ? (stats.notStarted / stats.total) * 100 : 0}%` }}
            />
          </div>
          <p className={styles.statHint}>还有 {stats.notStarted} 个知识点等待第一次复述</p>
        </div>
        <div className="stat-card">
          <div className={styles.statHead}>
            <span className={`${styles.statIcon} ${styles.statIconScore}`} aria-hidden="true">
              ◎
            </span>
            <p className="stat-label">平均复述得分</p>
          </div>
          <p className="stat-value">{stats.avgScore === null ? '—' : stats.avgScore}</p>
          <div className={styles.statMeter}>
            <span
              className={`${styles.statMeterFill} ${styles.meterBrand}`}
              style={{ width: `${stats.avgScore ?? 0}%` }}
            />
          </div>
          <p className={styles.statHint}>基于 {stats.scoreCount} 次已保存的复述评价</p>
        </div>
        <div className="stat-card">
          <div className={styles.statHead}>
            <span className={`${styles.statIcon} ${styles.statIconTop}`} aria-hidden="true">
              ★
            </span>
            <p className="stat-label">最高得分</p>
          </div>
          <p className="stat-value success">{stats.maxScore === null ? '—' : stats.maxScore}</p>
          <div className={styles.statMeter}>
            <span
              className={`${styles.statMeterFill} ${styles.meterGreen}`}
              style={{ width: `${stats.maxScore ?? 0}%` }}
            />
          </div>
          <p className={styles.statHint}>
            {stats.maxScore === null ? '完成一次复述后生成得分' : '距离满分还差 ' + (100 - stats.maxScore) + ' 分'}
          </p>
        </div>
      </div>

      {actionError && (
        <div className={`alert alert-error ${styles.alertBar}`} role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            className={styles.alertClose}
            onClick={() => setActionError('')}
          >
            关闭
          </button>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            className="input"
            type="search"
            placeholder="搜索标题或内容…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索知识点"
          />
        </div>
        <div className="toolbar-group">
          <div className="segmented" role="tablist" aria-label="按状态筛选">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={filter === item.key ? 'active' : ''}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className={styles.filterCount}>共 {filteredPoints.length} 个</span>
        </div>
      </div>

      {filteredPoints.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3 className="empty-title">
            {knowledgePoints.length === 0 ? '还没有知识点' : '没有符合条件的知识点'}
          </h3>
          <p className="empty-text">
            {knowledgePoints.length === 0
              ? '创建一个知识点，写清楚它的核心概念，然后用录音把它讲一遍。'
              : '换个关键词，或者把筛选条件切回“全部”看看。'}
          </p>
          {knowledgePoints.length === 0 ? (
            <Link to="/kp/new" className="btn btn-primary">
              + 创建第一个知识点
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      ) : (
        <div className={styles.kpGrid}>
          {filteredPoints.map((kp) => {
            const statusKey = kp.status || 'not_started';
            const score = kp.lastAttempt?.score;
            return (
              <article
                key={kp._id}
                className={`${styles.kpCard} ${kp.reviewList ? styles.review : ''}`}
                onClick={(e) => {
                  if (e.target.closest('a, button')) return;
                  navigate(`/kp/${kp._id}`);
                }}
                title="点击查看知识点详情与上次复述评价"
              >
                <div className={styles.kpTop}>
                  <span className={`badge ${STATUS_BADGE[statusKey] || 'badge-neutral'}`}>
                    {STATUS_LABELS[statusKey] || '未开始'}
                  </span>
                  {typeof score === 'number' && (
                    <span className={scoreBadgeClass(score)}>上次 {score} 分</span>
                  )}
                  <span className={styles.kpDate}>{formatDate(kp.createdAt)}</span>
                </div>

                <h2 className={styles.kpTitle}>{kp.title}</h2>

                <div className={styles.kpPreview}>
                  <MarkdownContent>{kp.content || '（暂无内容）'}</MarkdownContent>
                </div>

                <div className={styles.kpFoot}>
                  <Link
                    to={`/feynman/${kp._id}`}
                    className={`${styles.action} ${styles.actionRecord}`}
                  >
                    🎙 复述
                  </Link>
                  <Link
                    to={`/quiz/${kp._id}`}
                    className={`${styles.action} ${styles.actionQuiz}`}
                  >
                    📝 测评
                  </Link>
                  <Link to={`/kp/edit/${kp._id}`} className={styles.action}>
                    ✎ 编辑
                  </Link>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionDelete}`}
                    onClick={() => handleDelete(kp)}
                    disabled={deletingId === kp._id}
                  >
                    {deletingId === kp._id ? '删除中…' : '删除'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
