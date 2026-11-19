import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReactMediaRecorder } from 'react-media-recorder';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';
import { blobToBaiduWav } from '../utils/audio';

const DIFFICULTIES = ['基础', '中等', '困难'];
const TYPES = [
  { value: 'single-choice', label: '单选题' },
  { value: 'short-answer', label: '简答题' },
];

const btnBase = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid #c4b5fd',
  background: '#fff',
  color: '#5b21b6',
  cursor: 'pointer',
};

function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [kp, setKp] = useState(null);
  const [loadError, setLoadError] = useState('');

  // 难度和题型只是选择，必须点「开始出题」才真正请求模型
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

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKp(res.data);
      } catch (err) {
        setLoadError(err.response?.data?.msg || err.message || '获取知识点失败');
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

  // 录音转写结果追加到回答框，识别错的字用户可以直接改
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
  const micUnavailable = Boolean(recordError) || recordStatus === 'permission_denied' || recordStatus === 'failed';

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
      setSaveMessage('本次作答已保存。');
    } catch (err) {
      console.error('保存测评记录失败', err);
      setSaveMessage(`作答结果已显示，但保存记录失败：${err.response?.data?.msg || err.message}`);
    }
  };

  // 每次测评都覆盖状态：及格即已掌握，不及格才进入复习列表
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
      setReviewMessage(`测评结果已显示，但更新知识点状态失败：${err.response?.data?.msg || err.message}`);
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
      setResult(res.data);
      if (!res.data.isCorrect) markNeedsReview();
      saveAttempt({
        type: question.type,
        difficulty: question.difficulty,
        question: question.question,
        answerKeyPoints: question.answerKeyPoints,
        studentAnswer: shortAnswer.trim(),
        explanation: question.explanation,
        isCorrect: res.data.isCorrect,
        score: res.data.score,
        matchedPoints: res.data.matchedPoints,
        beyondPoints: res.data.beyondPoints,
        issues: res.data.issues,
        feedbackExplanation: res.data.explanation,
      });
    } catch (err) {
      setAnswerError(err.response?.data?.msg || err.message || 'AI 阅卷失败');
    } finally {
      setIsGrading(false);
    }
  };

  if (loadError) return <p style={{ padding: 20, color: '#dc2626' }}>{loadError}</p>;
  if (!kp) return <p style={{ padding: 20 }}>加载知识点信息...</p>;

  const busy = isGenerating || isGrading;
  const canStart = Boolean(type && difficulty) && !busy;
  const selectionChanged =
    Boolean(question) && (question.type !== type || question.difficulty !== difficulty);
  const scoreColor = (value) => (value >= 80 ? '#16a34a' : value >= 60 ? '#f59e0b' : '#dc2626');

  const optionStyle = (key) => {
    if (!result) {
      return {
        border: selectedOption === key ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
        background: selectedOption === key ? '#f5f3ff' : '#fff',
        opacity: 1,
      };
    }
    if (key === question.answer) {
      return { border: '2px solid #16a34a', background: '#f0fdf4', opacity: 1 };
    }
    if (key === selectedOption) {
      return { border: '2px solid #dc2626', background: '#fef2f2', opacity: 1 };
    }
    return { border: '1px solid #e5e7eb', background: '#fff', opacity: 0.55 };
  };

  const optionTag = (key) => {
    if (!result) return '';
    if (key === question.answer) return '（正确答案）';
    if (key === selectedOption) return '（你的选择）';
    return '';
  };

  return (
    <div style={{ maxWidth: 860, margin: '30px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(`/kp/${id}`)} style={btnBase}>
          返回知识点详情
        </button>
        <Link to={`/feynman/${id}`}>
          <button style={{ ...btnBase, border: 'none', background: '#10b981', color: '#fff' }}>
            🎤 去复述
          </button>
        </Link>
      </div>

      <h1 style={{ color: '#5b21b6', marginBottom: 6 }}>AI 测评：{kp.title}</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>
        先选好难度和题型，再点「开始出题」。出题依据只有下面这一个知识点，作答会自动保存。
      </p>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '18px 0' }}>
        <div>
          <span style={{ color: '#4c1d95', fontWeight: 600, marginRight: 8 }}>难度</span>
          {DIFFICULTIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDifficulty(item)}
              disabled={busy}
              style={{
                ...btnBase,
                marginRight: 8,
                background: difficulty === item ? '#8b5cf6' : '#fff',
                color: difficulty === item ? '#fff' : '#5b21b6',
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div>
          <span style={{ color: '#4c1d95', fontWeight: 600, marginRight: 8 }}>题型</span>
          {TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setType(item.value)}
              disabled={busy}
              style={{
                ...btnBase,
                marginRight: 8,
                background: type === item.value ? '#8b5cf6' : '#fff',
                color: type === item.value ? '#fff' : '#5b21b6',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <button
          type="button"
          onClick={fetchQuestion}
          disabled={!canStart}
          style={{
            padding: '9px 22px',
            border: 'none',
            borderRadius: 8,
            background: canStart ? '#8b5cf6' : '#ddd6fe',
            color: '#fff',
            cursor: canStart ? 'pointer' : 'not-allowed',
            fontSize: 15,
          }}
        >
          {isGenerating ? 'AI 出题中…' : question ? '重新出题' : '开始出题'}
        </button>
        {!type || !difficulty ? (
          <span style={{ color: '#6b7280', fontSize: 14 }}>请先选择难度和题型</span>
        ) : (
          selectionChanged && (
            <span style={{ color: '#f59e0b', fontSize: 14 }}>
              选择已更改，点「重新出题」生成新题
            </span>
          )
        )}
      </div>

      {questionError && <p style={{ color: '#dc2626' }}>{questionError}</p>}

      {question && (
        <div
          style={{
            background: '#fbfaff',
            border: '1px solid #e9d5ff',
            borderRadius: 12,
            padding: '18px 22px',
          }}
        >
          <div style={{ color: '#8b5cf6', fontSize: 13, marginBottom: 10 }}>
            {question.type === 'single-choice' ? '单选题' : '简答题'} · {question.difficulty}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#3b0764' }}>
            <MarkdownContent>{question.question}</MarkdownContent>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            {question.type === 'single-choice' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(question.options).map(([key, value]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 10,
                      cursor: result ? 'default' : 'pointer',
                      lineHeight: 1.6,
                      ...optionStyle(key),
                    }}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={key}
                      checked={selectedOption === key}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      disabled={Boolean(result)}
                      style={{ marginTop: 4 }}
                    />
                    <span>
                      {key}. {value}
                      {optionTag(key) && (
                        <strong style={{ marginLeft: 6, color: key === question.answer ? '#16a34a' : '#dc2626' }}>
                          {optionTag(key)}
                        </strong>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <>
                <textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  placeholder="用你自己的话回答，也可以点下面的「语音输入」直接说，识别结果可以修改"
                  rows={6}
                  readOnly={Boolean(result)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    background: result ? '#f9fafb' : '#fff',
                    fontSize: 15,
                    lineHeight: 1.6,
                    resize: 'vertical',
                  }}
                />

                {!result && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isGrading || isTranscribing}
                      style={{
                        padding: '7px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: isRecording ? '#ef4444' : '#10b981',
                        color: '#fff',
                        cursor: isGrading || isTranscribing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isRecording ? '■ 停止录音' : '🎤 语音输入'}
                    </button>
                    <span style={{ color: isRecording ? '#b91c1c' : '#6b7280', fontSize: 13 }}>
                      {isTranscribing
                        ? '正在识别语音，请稍候…'
                        : isRecording
                          ? '录音中，说完点「停止录音」，识别结果会填进回答框'
                          : '手敲太慢可以直接说，识别结果可以修改后再提交'}
                    </span>
                  </div>
                )}
                {micUnavailable && (
                  <p style={{ color: '#dc2626', margin: '8px 0 0' }}>
                    无法使用麦克风（{recordStatus === 'permission_denied' ? '浏览器未授权' : '设备不可用'}），请在地址栏允许麦克风权限后重试，或直接打字作答。
                  </p>
                )}
                {transcribeError && <p style={{ color: '#dc2626', margin: '8px 0 0' }}>{transcribeError}</p>}
              </>
            )}

            {answerError && <p style={{ color: '#dc2626' }}>{answerError}</p>}

            {!result && (
              <button
                type="submit"
                disabled={busy || isRecording || isTranscribing}
                style={{
                  marginTop: 16,
                  padding: '9px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: busy || isRecording || isTranscribing ? '#c4b5fd' : '#8b5cf6',
                  color: '#fff',
                  cursor: busy || isRecording || isTranscribing ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                }}
              >
                {isGrading ? 'AI 阅卷中…' : isTranscribing ? '语音识别中…' : '提交答案'}
              </button>
            )}
          </form>

          {result && (
            <div style={{ marginTop: 18, borderTop: '1px dashed #e9d5ff', paddingTop: 16 }}>
              <h2 style={{ margin: '0 0 10px', color: result.isCorrect ? '#16a34a' : '#dc2626' }}>
                {result.isCorrect ? '回答正确' : '回答错误'}
              </h2>

              {question.type === 'short-answer' && typeof result.score === 'number' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    flexWrap: 'wrap',
                    margin: '0 0 14px',
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                  }}
                >
                  <span style={{ color: '#6b7280', fontSize: 14 }}>得分</span>
                  <span style={{ fontSize: 34, fontWeight: 700, color: scoreColor(result.score) }}>
                    {result.score}
                  </span>
                  <span style={{ color: '#6b7280' }}>/ 100 分</span>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>
                    （60 分及格，低于 60 分自动加入复习列表）
                  </span>
                </div>
              )}

              {question.type === 'single-choice' ? (
                <>
                  <p style={{ margin: '6px 0' }}>
                    正确答案：<strong>{question.answer}</strong>　你的选择：
                    <strong>{result.studentAnswer}</strong>
                  </p>
                  {result.explanation && (
                    <p style={{ color: '#4b5563', lineHeight: 1.7 }}>
                      <strong>解析：</strong>
                      {result.explanation}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#374151', fontWeight: 600, marginBottom: 6 }}>你的回答</div>
                    <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                      {result.studentAnswer}
                    </div>
                  </div>

                  {result.matchedPoints?.length > 0 && (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 10,
                        padding: '10px 14px',
                        marginBottom: 10,
                      }}
                    >
                      <strong style={{ color: '#15803d' }}>符合知识点</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
                        {result.matchedPoints.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.beyondPoints?.length > 0 && (
                    <div
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 10,
                        padding: '10px 14px',
                        marginBottom: 10,
                      }}
                    >
                      <strong style={{ color: '#1d4ed8' }}>正确但知识点未涵盖</strong>
                      <span style={{ color: '#6b7280', fontSize: 13 }}>（属于关联拓展，不算错）</span>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
                        {result.beyondPoints.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.issues?.length > 0 && (
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 10,
                        padding: '10px 14px',
                        marginBottom: 10,
                      }}
                    >
                      <strong style={{ color: '#b45309' }}>需要修正或补充</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
                        {result.issues.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.explanation && (
                    <p style={{ color: '#4b5563', lineHeight: 1.7 }}>
                      <strong>阅卷意见：</strong>
                      {result.explanation}
                    </p>
                  )}
                </>
              )}

              {reviewMessage && <p style={{ color: '#f59e0b' }}>{reviewMessage}</p>}
              {saveMessage && <p style={{ color: '#6b7280', fontSize: 14 }}>{saveMessage}</p>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={fetchQuestion}
                  disabled={busy}
                  style={{ ...btnBase, border: 'none', background: '#8b5cf6', color: '#fff' }}
                >
                  再来一题
                </button>
                <Link to={`/kp/${id}`}>
                  <button type="button" style={btnBase}>查看知识点</button>
                </Link>
                <Link to="/">
                  <button type="button" style={btnBase}>返回主页</button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuizPage;
