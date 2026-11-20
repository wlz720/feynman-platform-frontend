import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReactMediaRecorder } from 'react-media-recorder';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';
import { blobToBaiduWav } from '../utils/audio';
import styles from './QuizPage.module.css';

const DIFFICULTIES = ['基础', '中等', '困难'];
const TYPES = [
  { value: 'single-choice', label: '单选题' },
  { value: 'short-answer', label: '简答题' },
];

function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [kp, setKp] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [question, setQuestion] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionError, setQuestionError] = useState('');

  const [selectedOption, setSelectedOption] = useState('');
  const [shortAnswer, setShortAnswer] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [answerError, setAnswerError] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const resultRef = useRef(null);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKp(res.data);
      } catch (err) {
        setLoadError(
          err.response?.data?.msg ||
            (err.response
              ? `加载知识点失败（HTTP ${err.response.status}）`
              : '无法连接后端服务，请确认后端已启动')
        );
      }
    };
    fetchKp();
  }, [id]);

  const resetAnswerState = () => {
    setSelectedOption('');
    setShortAnswer('');
    setResult(null);
    setAnswerError('');
    setReviewMessage('');
    setSaveMessage('');
    setTranscribeError('');
  };

  const resetQuestion = () => {
    setQuestion(null);
    setQuestionError('');
    resetAnswerState();
  };

  const handleVoiceStop = useCallback(async (blobUrl, blob) => {
    if (!blob || !blob.size) {
      setTranscribeError('没有录到声音，请检查麦克风后重试');
      return;
    }
    setIsTranscribing(true);
    setTranscribeError('');
    try {
      const { blob: wavBlob } = await blobToBaiduWav(blob);
      const audioFile = new File([wavBlob], 'quiz-answer.wav', { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioFile);
      const resp = await apiClient.post('/audio/transcribe', formData);
      const text = String(resp.data?.result || '').trim();
      if (!text) {
        setTranscribeError('没有识别到文字，请靠近麦克风再说一次');
        return;
      }
      setShortAnswer((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
    } catch (err) {
      setTranscribeError(err.response?.data?.msg || err.message || '语音识别失败');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const {
    status: recordStatus,
    error: recordError,
    startRecording,
    stopRecording,
  } = useReactMediaRecorder({
    audio: true,
    onStop: handleVoiceStop,
  });

  const isRecording = recordStatus === 'recording';
  const micUnavailable =
    Boolean(recordError) ||
    recordStatus === 'permission_denied' ||
    recordStatus === 'no_specified_media_found' ||
    recordStatus === 'media_in_use';

  const fetchQuestion = async () => {
    if (!kp || !type || !difficulty || isGenerating) return;
    setIsGenerating(true);
    setQuestion(null);
    setQuestionError('');
    resetAnswerState();
    try {
      const res = await apiClient.post('/ai/generate-question', {
        knowledgePointContent: kp.content,
        difficulty,
        type,
      });
      setQuestion(res.data);
    } catch (err) {
      setQuestionError(err.response?.data?.msg || err.message || 'AI 出题失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAttempt = async (payload) => {
    try {
      await apiClient.post('/quiz/attempts', { knowledgePointId: id, ...payload });
      setSaveMessage('本次作答已保存，可在「测评记录」中回看。');
    } catch (err) {
      console.error('保存测评记录失败', err);
      setSaveMessage(
        `作答结果已显示，但保存记录失败：${err.response?.data?.msg || err.message}`
      );
    }
  };

  const syncResultStatus = async (isCorrect) => {
    setReviewMessage('正在同步知识点状态…');
    try {
      await apiClient.put(`/knowledge-points/${id}`, {
        reviewList: !isCorrect,
        status: isCorrect ? 'mastered' : 'need_review',
      });
      setReviewMessage(
        isCorrect
          ? '本次测评及格，知识点已标记为已掌握。'
          : '本次测评不及格，知识点已加入复习列表。'
      );
    } catch (err) {
      setReviewMessage(
        `测评结果已显示，但更新知识点状态失败：${err.response?.data?.msg || err.message}`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question || isGrading || result) return;
    setAnswerError('');

    if (question.type === 'single-choice') {
      if (!selectedOption) {
        setAnswerError('请先选择一个答案');
        return;
      }
      const isCorrect = selectedOption === question.answer;
      setResult({
        isCorrect,
        explanation: question.explanation,
        correctAnswer: question.answer,
        studentAnswer: selectedOption,
      });
      syncResultStatus(isCorrect);
      saveAttempt({
        type: question.type,
        difficulty: question.difficulty,
        question: question.question,
        options: question.options,
        correctAnswer: question.answer,
        studentAnswer: selectedOption,
        explanation: question.explanation,
        isCorrect,
      });
      return;
    }

    if (isRecording) {
      setAnswerError('请先点「停止录音」，等语音识别完成再提交');
      return;
    }
    if (!shortAnswer.trim()) {
      setAnswerError('请先写下你的回答');
      return;
    }

    setIsGrading(true);
    try {
      const res = await apiClient.post('/ai/grade-answer', {
        question: question.question,
        answerKeyPoints: question.answerKeyPoints,
        studentAnswer: shortAnswer.trim(),
        knowledgePointTitle: kp.title,
        knowledgePointContent: kp.content,
      });
      const graded = res.data;
      setResult(graded);
      syncResultStatus(graded.isCorrect);
      saveAttempt({
        type: question.type,
        difficulty: question.difficulty,
        question: question.question,
        answerKeyPoints: question.answerKeyPoints,
        studentAnswer: shortAnswer.trim(),
        explanation: question.explanation,
        isCorrect: graded.isCorrect,
        score: graded.score,
        matchedPoints: graded.matchedPoints,
        beyondPoints: graded.beyondPoints,
        issues: graded.issues,
        feedbackExplanation: graded.explanation,
      });
    } catch (err) {
      setAnswerError(err.response?.data?.msg || err.message || 'AI 阅卷失败');
    } finally {
      setIsGrading(false);
    }
  };

  const handleDifficultyChange = (value) => {
    if (value === difficulty) return;
    setDifficulty(value);
    resetQuestion();
  };

  const handleTypeChange = (value) => {
    if (value === type) return;
    setType(value);
    resetQuestion();
  };

  if (loadError) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">无法打开测评</h3>
          <p className="empty-text">{loadError}</p>
          <div className="row">
            <Link to="/" className="btn btn-primary">
              返回主页
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!kp) {
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

  const busy = isGenerating || isGrading;
  const setupLocked = busy || isRecording || isTranscribing;
  const canStart = Boolean(type && difficulty) && !setupLocked;
  const score = Number(result?.score) || 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#8b5cf6' : '#ef4444';
  const reviewFailed = reviewMessage.includes('失败');

  const optionClass = (key) => {
    const classes = [styles.option];
    if (!result) {
      if (selectedOption === key) classes.push(styles.selected);
    } else if (key === question.answer) {
      classes.push(styles.correct);
    } else if (key === selectedOption) {
      classes.push(styles.wrong);
    } else {
      classes.push(styles.dim);
    }
    return classes.join(' ');
  };

  const optionTag = (key) => {
    if (!result) return '';
    if (key === question.answer) return '正确答案';
    if (key === selectedOption) return '你的选择';
    return '';
  };

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
          <span className="eyebrow">AI QUIZ</span>
          <h1 className="page-title">AI 测评</h1>
          <p className="page-subtitle">
            知识点：{kp.title}。先选难度和题型，再让 AI 依据这份笔记出题。
          </p>
        </div>
        <Link to={`/quiz/${id}/history`} className="btn btn-secondary">
          测评记录
        </Link>
      </div>

      <section className={`card ${styles.setupCard}`}>
        <div className={styles.setupGrid}>
          <div className={styles.setupGroup}>
            <span className={styles.setupLabel}>难度</span>
            <div className="segmented" role="group" aria-label="选择难度">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={difficulty === item ? 'active' : ''}
                  onClick={() => handleDifficultyChange(item)}
                  disabled={setupLocked}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.setupGroup}>
            <span className={styles.setupLabel}>题型</span>
            <div className="segmented" role="group" aria-label="选择题型">
              {TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={type === item.value ? 'active' : ''}
                  onClick={() => handleTypeChange(item.value)}
                  disabled={setupLocked}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.setupFoot}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={fetchQuestion}
            disabled={!canStart}
          >
            {isGenerating ? 'AI 出题中…' : question ? '重新出题' : '开始出题'}
          </button>
          <span className={styles.setupHint}>
            {!type || !difficulty
              ? '请先选择难度和题型。'
              : isGenerating
                ? 'AI 正在根据当前知识点生成题目，请稍候。'
                : '出题只依据当前这一个知识点，不会混入其他笔记。'}
          </span>
          <Link to={`/feynman/${id}`} className="btn btn-success btn-sm">
            🎙 去复述
          </Link>
        </div>
      </section>

      {questionError && (
        <div className="alert alert-error" style={{ marginTop: 14 }} role="alert">
          {questionError}
        </div>
      )}

      {question && (
        <section className={`card ${styles.questionCard}`}>
          <div className={styles.questionMeta}>
            <span className="badge badge-brand">
              {question.type === 'single-choice' ? '单选题' : '简答题'}
            </span>
            <span className="badge badge-neutral">{question.difficulty}</span>
            {result && (
              <span
                className={`badge ${result.isCorrect ? 'badge-success' : 'badge-danger'}`}
              >
                {result.isCorrect ? '已答对' : '已作答'}
              </span>
            )}
            <span className={styles.questionMetaRight}>题目依据：当前知识点</span>
          </div>

          <div className={styles.questionText}>
            <MarkdownContent>{question.question}</MarkdownContent>
          </div>

          <form className={styles.answerArea} onSubmit={handleSubmit}>
            {question.type === 'single-choice' ? (
              <div className={styles.options}>
                {Object.entries(question.options || {}).map(([key, value]) => (
                  <label key={key} className={optionClass(key)}>
                    <input
                      type="radio"
                      name="option"
                      value={key}
                      checked={selectedOption === key}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      disabled={Boolean(result)}
                    />
                    <span className={styles.optionKey}>{key}</span>
                    <span className={styles.optionText}>{value}</span>
                    {optionTag(key) && <span className={styles.optionTag}>{optionTag(key)}</span>}
                  </label>
                ))}
              </div>
            ) : (
              <>
                <textarea
                  className={`textarea ${styles.answerTextarea}`}
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  placeholder="用你自己的话回答，也可以点下面的「语音输入」直接说，识别结果可以修改。"
                  rows={6}
                  readOnly={Boolean(result)}
                  aria-label="简答题回答"
                />

                {!result && (
                  <div className={styles.voiceRow}>
                    <button
                      type="button"
                      className={`btn btn-sm ${isRecording ? 'btn-danger' : 'btn-success'}`}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isGrading || isTranscribing}
                    >
                      {isRecording ? '■ 停止录音' : '🎤 语音输入'}
                    </button>
                    <span
                      className={`${styles.voiceHint} ${isRecording ? styles.recording : ''}`}
                    >
                      {isTranscribing
                        ? '正在识别语音，请稍候…'
                        : isRecording
                          ? '录音中，说完点「停止录音」，识别结果会填进回答框。'
                          : '手敲太慢可以直接说，识别结果可以修改后再提交。'}
                    </span>
                  </div>
                )}

                {micUnavailable && (
                  <div className="alert alert-warning inlineAlert">
                    无法使用麦克风（
                    {recordStatus === 'permission_denied' ? '浏览器未授权' : '设备不可用'}
                    ），请在地址栏允许麦克风权限后重试，或直接打字作答。
                  </div>
                )}

                {transcribeError && (
                  <div className="alert alert-error inlineAlert" role="alert">
                    {transcribeError}
                  </div>
                )}
              </>
            )}

            {answerError && (
              <div className="alert alert-error inlineAlert" role="alert">
                {answerError}
              </div>
            )}

            {!result && (
              <div className={styles.submitRow}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy || isRecording || isTranscribing}
                >
                  {isGrading
                    ? 'AI 阅卷中…'
                    : isTranscribing
                      ? '语音识别中…'
                      : '提交答案'}
                </button>
                <span className="hint">提交后 AI 会依据知识点内容阅卷，结果自动保存。</span>
              </div>
            )}
          </form>

          {result && (
            <div className={styles.resultPanel} ref={resultRef}>
              <div
                className={`${styles.resultBanner} ${
                  result.isCorrect ? styles.ok : styles.bad
                }`}
              >
                <span className={styles.resultIcon}>{result.isCorrect ? '✓' : '!'}</span>
                <div>
                  <h2>
                    {question.type === 'short-answer'
                      ? result.isCorrect
                        ? '回答合格'
                        : '还需要补一补'
                      : result.isCorrect
                        ? '回答正确'
                        : '回答错误'}
                  </h2>
                  <p>
                    {question.type === 'short-answer'
                      ? 'AI 依据当前知识点阅卷，60 分及格。'
                      : result.isCorrect
                        ? '选择正确，继续保持。'
                        : '选择错误，看看下面的解析找关键差别。'}
                  </p>
                </div>
              </div>

              {question.type === 'short-answer' && (
                <div className={styles.scoreSummary}>
                  <div className={styles.scoreLine}>
                    <span className={styles.scoreNumber} style={{ color: scoreColor }}>
                      {score}
                    </span>
                    <span className={styles.scoreTotal}>/ 100 分</span>
                    <span className={styles.scoreHint}>60 分及格，低于 60 分自动加入复习列表</span>
                  </div>
                  <div className={styles.scoreTrack}>
                    <div
                      className={styles.scoreFill}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: scoreColor }}
                    />
                  </div>
                </div>
              )}

              {question.type === 'single-choice' ? (
                <>
                  <div className={styles.choiceLine}>
                    <span className={`${styles.choicePill} ${styles.correct}`}>
                      正确答案：{result.correctAnswer}
                    </span>
                    {!result.isCorrect && (
                      <span className={`${styles.choicePill} ${styles.picked}`}>
                        你的选择：{result.studentAnswer}
                      </span>
                    )}
                  </div>
                  {result.explanation && (
                    <p className={styles.explanation}>
                      <strong>解析：</strong>
                      {result.explanation}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {result.matchedPoints?.length > 0 && (
                    <div className={`${styles.feedbackBlock} ${styles.success}`}>
                      <h3 className={styles.feedbackTitle}>符合知识点</h3>
                      <ul>
                        {result.matchedPoints.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.beyondPoints?.length > 0 && (
                    <div className={`${styles.feedbackBlock} ${styles.info}`}>
                      <h3 className={styles.feedbackTitle}>正确拓展（不加分、不扣分）</h3>
                      <ul>
                        {result.beyondPoints.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.issues?.length > 0 && (
                    <div className={`${styles.feedbackBlock} ${styles.warning}`}>
                      <h3 className={styles.feedbackTitle}>需要修正或补充</h3>
                      <ul>
                        {result.issues.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.explanation && (
                    <p className={styles.explanation}>
                      <strong>阅卷意见：</strong>
                      {result.explanation}
                    </p>
                  )}
                </>
              )}

              {reviewMessage && (
                <span
                  className={`${styles.syncNote} ${
                    reviewFailed
                      ? styles.warning
                      : reviewMessage.startsWith('正在')
                        ? styles.neutral
                        : result.isCorrect
                          ? styles.success
                          : styles.warning
                  }`}
                >
                  {reviewMessage}
                </span>
              )}
              {saveMessage && <span className={styles.saveNote}>{saveMessage}</span>}

              <div className={styles.resultActions}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={fetchQuestion}
                  disabled={busy}
                >
                  再来一题
                </button>
                <Link to={`/kp/${id}`} className="btn btn-secondary">
                  查看知识点
                </Link>
                <Link to={`/quiz/${id}/history`} className="btn btn-ghost">
                  测评记录
                </Link>
                <Link to="/" className="btn btn-ghost">
                  返回主页
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default QuizPage;
