import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';
import { blobToBaiduWav } from '../utils/audio';
import styles from './FeynmanRecordPage.module.css';

const REVIEW_THRESHOLD = 60;

const STATUS_TEXT = {
  idle: '准备就绪，点击开始录音',
  acquiring_media: '正在请求麦克风权限…',
  delayed_start: '正在启动录音…',
  recording: '正在录音…',
  stopping: '正在结束录音…',
  stopped: '录音结束，音频已生成',
  paused: '录音已暂停',
  permission_denied: '麦克风权限被拒绝，请在地址栏允许麦克风后重试',
  no_specified_media_found: '没有找到麦克风设备，请检查设备连接',
  media_in_use: '麦克风被其他应用占用，请关闭后重试',
  media_aborted: '录音被中断，请重试',
  invalid_media_constraints: '当前麦克风参数不受支持，请更换设备',
  no_constraints: '录音参数缺失，请刷新页面后重试',
  recorder_error: '录音器异常，请刷新页面后重试',
};

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function FeynmanRecordPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kpTitle, setKpTitle] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [transcribeError, setTranscribeError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [lastBlob, setLastBlob] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const [aiFeedback, setAiFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [savedInfo, setSavedInfo] = useState(null);
  const [evaluatedText, setEvaluatedText] = useState('');

  useEffect(() => {
    const fetchKpTitle = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKpTitle(res.data.title);
      } catch (err) {
        console.error('获取知识点失败：', err);
      }
    };
    fetchKpTitle();
  }, [id]);

  const getAiEvaluation = useCallback(
    async (text) => {
      setIsEvaluating(true);
      setAiFeedback(null);
      setAiError('');
      setSavedInfo(null);
      try {
        const kpResponse = await apiClient.get(`/knowledge-points/${id}`);
        const feedbackResponse = await apiClient.post('/audio/evaluate', {
          originalContent: kpResponse.data.content,
          transcribedText: text,
          knowledgePointId: id,
        });
        setAiFeedback(feedbackResponse.data);
        setSavedInfo(feedbackResponse.data.saved || null);
        setEvaluatedText(text);
      } catch (err) {
        console.error('获取 AI 评价失败', err);
        setAiError(err.response?.data?.msg || err.message || '获取 AI 评价失败');
      } finally {
        setIsEvaluating(false);
      }
    },
    [id]
  );

  const uploadAudio = useCallback(
    async (audioBlob) => {
      if (!audioBlob) return;
      setIsUploading(true);
      setTranscribedText('');
      setTranscribeError('');
      setAiFeedback(null);
      setAiError('');
      setSavedInfo(null);
      setEvaluatedText('');
      try {
        const { blob: wavBlob } = await blobToBaiduWav(audioBlob);
        const audioFile = new File([wavBlob], `record-${id}.wav`, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('knowledgePointId', id);

        const resp = await apiClient.post('/audio/transcribe', formData);
        setTranscribedText(resp.data.result || '');
      } catch (err) {
        console.error('上传转录失败：', err);
        setTranscribeError(err.response?.data?.msg || err.message || '转录失败');
      } finally {
        setIsUploading(false);
      }
    },
    [id]
  );

  const { status, error, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } =
    useReactMediaRecorder({
      audio: true,
      onStop: async (blobUrl, blob) => {
        setLastBlob(blob);
        await uploadAudio(blob);
      },
    });

  useEffect(() => {
    if (status !== 'recording') return undefined;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const isRecording = status === 'recording';
  const isBusy = status === 'acquiring_media' || status === 'stopping';
  const hasError = Boolean(error || localError);

  const handleStart = () => {
    if (isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setLocalError(
        '当前环境不支持麦克风录音，请使用 Chrome/Edge，并通过 localhost 或 HTTPS 访问。'
      );
      return;
    }
    setLocalError('');
    setElapsed(0);
    setTranscribedText('');
    setTranscribeError('');
    setAiFeedback(null);
    setAiError('');
    setSavedInfo(null);
    setEvaluatedText('');
    setLastBlob(null);
    if (clearBlobUrl) clearBlobUrl();
    startRecording();
  };

  const statusText = localError
    ? localError
    : error
      ? STATUS_TEXT[error] || `录音出错：${error}`
      : STATUS_TEXT[status] || '准备就绪';

  const textEdited = Boolean(aiFeedback) && transcribedText.trim() !== evaluatedText.trim();
  const needsConfirm = Boolean(transcribedText.trim()) && !aiFeedback && !isEvaluating;
  const score = Number(aiFeedback?.score) || 0;
  const ringColor = score >= 80 ? '#10b981' : score >= REVIEW_THRESHOLD ? '#8b5cf6' : '#ef4444';

  return (
    <div className="page">
      <button type="button" className={styles.backLink} onClick={() => navigate(`/kp/${id}`)}>
        ← 返回知识点详情
      </button>

      <div className="page-header">
        <div>
          <span className="eyebrow">FEYNMAN TECHNIQUE</span>
          <h1 className="page-title">费曼复述</h1>
          <p className="page-subtitle">
            {kpTitle ? `正在复述：${kpTitle}` : '加载知识点…'}
          </p>
        </div>
        <Link to={`/quiz/${id}/history`} className="btn btn-secondary btn-sm">
          测评记录
        </Link>
      </div>

      <section className={`${styles.stage} ${hasError ? styles.stageError : ''}`}>
        <div className={styles.stageMain}>
          <div className={styles.statusRow}>
            <span className={`${styles.liveDot} ${isRecording ? styles.recording : ''}`} />
            {statusText}
          </div>

          <div className={`${styles.micOrb} ${isRecording ? styles.recording : ''}`}>
            <span aria-hidden="true">🎙</span>
          </div>

          <div className={styles.timer}>{formatTime(elapsed)}</div>
          <div className={styles.timerLabel}>RECORDING TIME</div>

          <div className={`${styles.wave} ${isRecording ? styles.active : ''}`}>
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <span key={index} style={{ animationDelay: `${index * 0.12}s` }} />
            ))}
          </div>

          <div className={styles.recordControls}>
            <button
              type="button"
              className={styles.recordBtn}
              onClick={handleStart}
              disabled={isRecording || isBusy}
            >
              {isRecording ? '录音中…' : isBusy ? '请稍候…' : '● 开始录音'}
            </button>
            <button
              type="button"
              className={styles.stopBtn}
              onClick={stopRecording}
              disabled={!isRecording}
            >
              ■ 停止录音
            </button>
          </div>

          {(isUploading || transcribeError) && (
            <p className={styles.statusHint}>
              {isUploading
                ? '正在上传音频并转写，请稍候…'
                : '转写失败，可在下方重试，或直接手动输入复述内容。'}
            </p>
          )}
          {!hasError && elapsed >= 180 && (
            <p className={styles.statusHint}>
              已录 {formatTime(elapsed)}，建议控制在 1–3 分钟，讲清核心概念即可。
            </p>
          )}
        </div>

        <aside className={styles.stageTips}>
          <h3>🎯 讲清楚的三条标准</h3>
          <ul>
            <li>先给一句话定义，别一上来堆术语。</li>
            <li>举一个具体例子，说明它怎么用。</li>
            <li>指出一个容易踩的坑，证明你真的理解。</li>
          </ul>
          <h3 style={{ marginTop: 16 }}>🔒 录音小贴士</h3>
          <ul>
            <li>在安静环境，离麦克风一拳距离。</li>
            <li>转写文字可以直接修改，再提交评分。</li>
            <li>音频仅用于本次转写，不会公开。</li>
          </ul>
        </aside>
      </section>

      {mediaBlobUrl && (
        <section className={`card card-pad ${styles.playbackCard}`}>
          <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
            <div>
              <h2 className="section-title">录音回放</h2>
              <p className="section-subtitle">听一遍自己的表达，往往能发现卡壳的地方。</p>
            </div>
            <span className="badge badge-success">已生成音频</span>
          </div>
          <audio className={styles.audio} src={mediaBlobUrl} controls />
        </section>
      )}

      <section className={`card card-pad ${styles.sectionCard}`}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className="section-title">语音转写</h2>
            <p className="section-subtitle">
              识别结果可能有个别错字，先核对修改，再交给 AI 教练评分。
            </p>
          </div>
          {isUploading && (
            <span className="badge badge-warning">
              <span className="spinner" style={{ width: 12, height: 12 }} />
              转写中
            </span>
          )}
        </div>

        {transcribeError && (
          <div className="alert alert-error" style={{ marginBottom: 12 }} role="alert">
            <span>转录失败：{transcribeError}</span>
            {lastBlob && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => uploadAudio(lastBlob)}
                disabled={isUploading}
              >
                重新转写
              </button>
            )}
          </div>
        )}

        <textarea
          className={`textarea ${styles.transcriptArea}`}
          value={transcribedText}
          onChange={(e) => setTranscribedText(e.target.value)}
          disabled={isUploading || isEvaluating}
          rows={7}
          placeholder="录音结束后，转写文字会自动出现在这里；识别有误可以直接修改。"
          aria-label="复述转写文本"
        />

        <div className={styles.transcriptActions}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => getAiEvaluation(transcribedText.trim())}
            disabled={!transcribedText.trim() || isUploading || isEvaluating}
          >
            {isEvaluating
              ? 'AI 正在批阅…'
              : aiFeedback
                ? '用修改后的文本重新评分'
                : '提交给 AI 教练'}
          </button>
          <span
            className={`${styles.transcriptHint} ${
              needsConfirm || textEdited ? styles.warn : ''
            }`}
          >
            {needsConfirm
              ? '识别完成，请先核对并修改文本，确认无误后再提交评分。'
              : textEdited
                ? '文本已修改，建议重新评分让 AI 看到最新版本。'
                : '识别不准确时可直接修改上面的文本。'}
          </span>
        </div>
      </section>

      {(isEvaluating || aiFeedback || aiError) && (
        <section className={`card card-pad ${styles.sectionCard}`}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className="section-title">AI 教练反馈</h2>
              <p className="section-subtitle">评分、润色文本与改进建议，会一起写回知识点。</p>
            </div>
            {savedInfo && (
              <span
                className={`badge ${savedInfo.reviewList ? 'badge-danger' : 'badge-success'}`}
              >
                {savedInfo.reviewList
                  ? `低于 ${REVIEW_THRESHOLD} 分，已加入复习列表`
                  : '已标记为已掌握'}
              </span>
            )}
          </div>

          {isEvaluating && (
            <div className="loading-block">
              <span className="spinner" />
              AI 教练正在批阅你的复述…
            </div>
          )}

          {aiError && (
            <div className="alert alert-error" role="alert">
              <span>{aiError}</span>
              {transcribedText.trim() && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => getAiEvaluation(transcribedText.trim())}
                  disabled={isEvaluating}
                >
                  重试
                </button>
              )}
            </div>
          )}

          {aiFeedback && (
            <>
              <div className={styles.resultTop}>
                <div className={styles.scoreWrap}>
                  <div
                    className="score-ring"
                    style={{ '--score': score, '--ring-color': ringColor }}
                  >
                    <span className="score-ring-value">{score}</span>
                    <span className="score-ring-label">分 / 100</span>
                  </div>
                  <span className={styles.scoreCaption}>
                    {score >= 80
                      ? '讲得很清楚，保持住'
                      : score >= REVIEW_THRESHOLD
                        ? '基本讲清，还能更具体'
                        : '建议回到原文补盲区'}
                  </span>
                </div>
                <blockquote className={styles.evaluation}>
                  {aiFeedback.evaluation || '（模型没有返回综合评价）'}
                </blockquote>
              </div>

              <div className={styles.polishedPanel}>
                <h3>AI 润色后的文本</h3>
                <p className={styles.polishedBody}>
                  {aiFeedback.polishedText || '（模型没有返回润色文本）'}
                </p>
              </div>

              {(aiFeedback.strengths?.length > 0 || aiFeedback.weaknesses?.length > 0) && (
                <div className={styles.lists}>
                  {aiFeedback.strengths?.length > 0 && (
                    <div className={`${styles.listCard} ${styles.success}`}>
                      <h3>优点 👍</h3>
                      <ul>
                        {aiFeedback.strengths.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiFeedback.weaknesses?.length > 0 && (
                    <div className={`${styles.listCard} ${styles.warning}`}>
                      <h3>待改进 👇</h3>
                      <ul>
                        {aiFeedback.weaknesses.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.feedbackActions}>
                <Link to={`/kp/${id}`} className="btn btn-primary">
                  查看知识点详情
                </Link>
                <Link to={`/quiz/${id}/history`} className="btn btn-secondary">
                  测评记录
                </Link>
                <button type="button" className="btn btn-ghost" onClick={handleStart}>
                  再录一次
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default FeynmanRecordPage;
