import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import styles from './KnowledgePointFormPage.module.css';

function KnowledgePointFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({ title: '', content: '' });
  const [originData, setOriginData] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;

    const fetchKP = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const res = await apiClient.get(`/knowledge-points/${id}`);
        if (cancelled) return;
        const data = { title: res.data.title || '', content: res.data.content || '' };
        setFormData(data);
        setOriginData(data);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err.response?.data?.msg ||
            err.message ||
            '加载知识点失败，请稍后重试'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchKP();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError('');

    const title = formData.title.trim();
    const content = formData.content.trim();
    if (!title) {
      setSubmitError('标题不能为空');
      return;
    }
    if (!content) {
      setSubmitError('内容不能为空');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await apiClient.put(`/knowledge-points/${id}`, { title, content });
        navigate(`/kp/${id}`);
      } else {
        const res = await apiClient.post('/knowledge-points', { title, content });
        navigate(res.data?._id ? `/kp/${res.data._id}` : '/');
      }
    } catch (err) {
      const backendMsg = err.response?.data?.msg;
      setSubmitError(
        backendMsg
          ? `保存失败：${backendMsg}`
          : err.response
            ? `保存失败（HTTP ${err.response.status}），请稍后重试`
            : '保存失败：无法连接后端服务'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const isChanged =
      formData.title !== originData.title || formData.content !== originData.content;
    if (!isChanged) {
      navigate('/');
      return;
    }
    const message = isEdit
      ? '确定放弃修改，退出编辑吗？未保存的改动会丢失！'
      : '确定放弃本次新建，退出吗？填写的内容会丢失！';
    if (window.confirm(message)) {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="page narrow">
        <div className="card card-pad">
          <div className="loading-block">
            <span className="spinner" />
            正在加载知识点…
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page narrow">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">无法打开这个知识点</h3>
          <p className="empty-text">{loadError}</p>
          <div className="row">
            <Link to="/" className="btn btn-primary">
              返回主页
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <Link to="/" className={styles.backLink}>
        ← 返回知识点列表
      </Link>

      <div className="page-header">
        <div>
          <span className="eyebrow">{isEdit ? 'EDIT NOTE' : 'NEW NOTE'}</span>
          <h1 className="page-title">{isEdit ? '编辑知识点' : '新建知识点'}</h1>
          <p className="page-subtitle">
            用自己的话写清楚核心概念。内容支持 Markdown，写完就去录一段复述。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.layout}>
          <div className={`card ${styles.editorCard}`}>
            {submitError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: 18 }}>
                {submitError}
              </div>
            )}

            <div className="field">
              <div className={styles.metaRow}>
                <label className="label" htmlFor="kp-title">
                  标题
                  <span className="required">*</span>
                </label>
                <span className={styles.charCount}>{formData.title.length} 字</span>
              </div>
              <input
                id="kp-title"
                className="input"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="例如：React 的 useEffect 依赖数组"
                required
              />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <div className={styles.metaRow}>
                <label className="label" htmlFor="kp-content">
                  内容（支持 Markdown）
                  <span className="required">*</span>
                </label>
                <span className={styles.charCount}>{formData.content.length} 字</span>
              </div>
              <textarea
                id="kp-content"
                className="textarea"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder={'用大白话解释这个概念，可以包含：\n- 它解决什么问题\n- 核心机制是什么\n- 一个容易踩坑的例子'}
                rows={14}
                required
              />
              <span className="hint">
                写完后点「保存」，系统会带你进入详情页，可以直接开始录音复述。
              </span>
            </div>

            <div className={styles.formActions}>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? '保存中…' : isEdit ? '保存修改' : '保存并查看'}
              </button>
            </div>
          </div>

          <aside className={styles.side}>
            <div className={styles.tipCard}>
              <h3 className={styles.tipTitle}>✍️ 费曼写作提示</h3>
              <ul className={styles.tipList}>
                <li>假设读者完全没学过，别堆术语。</li>
                <li>先写“一句话定义”，再补细节。</li>
                <li>举一个你真实踩过的坑。</li>
                <li>写不清的地方，就是待补的盲区。</li>
              </ul>
            </div>
            <div className={styles.tipCard}>
              <h3 className={styles.tipTitle}>🧩 常用 Markdown</h3>
              <pre className={styles.codeBlock}>{`## 小标题
- 列表项
**重点**  \`代码\`
> 引用`}</pre>
              <p className="hint" style={{ marginTop: 8 }}>
                标题、列表和代码块能让复述时更容易抓住结构。
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

export default KnowledgePointFormPage;
