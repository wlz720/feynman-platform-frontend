import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';
import { blobToBaiduWav } from '../utils/audio';

const REVIEW_THRESHOLD = 60;

function FeynmanRecordPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kpTitle, setKpTitle] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [transcribeError, setTranscribeError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [aiFeedback, setAiFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [savedInfo, setSavedInfo] = useState(null);
  const [evaluatedText, setEvaluatedText] = useState('');

  // 获取知识点标题
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

  // 拿原始知识点内容 → 交给大模型润色 + 评价，评价结果由后端写回该知识点
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
      setIsUploading(true);
      setTranscribedText('');
      setTranscribeError('');
      setAiFeedback(null);
      setAiError('');
      setSavedInfo(null);
      setEvaluatedText('');
      try {
        // 浏览器录出来通常是 webm/opus，这里统一转成 16kHz 单声道 wav
        const { blob: wavBlob } = await blobToBaiduWav(audioBlob);
        const audioFile = new File([wavBlob], `record-${id}.wav`, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('knowledgePointId', id);

        const resp = await apiClient.post('/audio/transcribe', formData);
        setTranscribedText(resp.data.result);
        await getAiEvaluation(resp.data.result);
      } catch (err) {
        console.error('上传转录失败：', err);
        setTranscribeError(err.response?.data?.msg || err.message || '转录失败');
      } finally {
        setIsUploading(false);
      }
    },
    [id, getAiEvaluation]
  );

  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl, blob) => {
      await uploadAudio(blob);
    },
  });

  const handleStart = () => {
    setTranscribedText('');
    setTranscribeError('');
    setAiFeedback(null);
    setAiError('');
    setSavedInfo(null);
    setEvaluatedText('');
    startRecording();
  };

  const textEdited = Boolean(aiFeedback) && transcribedText.trim() !== evaluatedText.trim();
  const scoreColor =
    aiFeedback?.score >= 80 ? '#16a34a' : aiFeedback?.score >= REVIEW_THRESHOLD ? '#f59e0b' : '#dc2626';

  return (
    <div style={{ maxWidth: 860, margin: '30px auto', padding: '0 20px' }}>
      <h1 style={{ color: '#5b21b6' }}>费曼复述：{kpTitle}</h1>
      <p>录音状态：{status}</p>

      <div style={{ margin: '20px 0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleStart}
          disabled={status === 'recording'}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#22c55e',
            color: '#fff',
            cursor: status === 'recording' ? 'not-allowed' : 'pointer',
          }}
        >
          开始录音
        </button>
        <button
          onClick={stopRecording}
          disabled={status !== 'recording'}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            cursor: status !== 'recording' ? 'not-allowed' : 'pointer',
          }}
        >
          停止录音
        </button>
        <button
          onClick={() => navigate(`/kp/${id}`)}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #aaa', background: '#fff' }}
        >
          查看知识点详情
        </button>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #aaa', background: '#fff' }}
        >
          返回仪表盘
        </button>
      </div>

      {/* 回放音频，自闭合标签 */}
      {mediaBlobUrl && (
        <div style={{ margin: '12px 0' }}>
          <p>录音回放：</p>
          <audio src={mediaBlobUrl} controls />
        </div>
      )}

      <hr style={{ margin: '30px 0' }} />

      <h2>AI语音转录结果</h2>
      {isUploading && <p>🟡正在上传音频并调用百度语音识别，请稍候...</p>}
      {transcribeError && (
        <p style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8 }}>
          转录失败：{transcribeError}
        </p>
      )}

      <textarea
        value={transcribedText}
        onChange={(e) => setTranscribedText(e.target.value)}
        disabled={isUploading || isEvaluating}
        rows={6}
        placeholder="转录后的文字会显示在这里；识别有误可以直接修改，再提交给 AI 教练"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: 14,
          borderRadius: 8,
          border: '1px solid #ccc',
          fontSize: 15,
          lineHeight: 1.7,
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 0' }}>
        <button
          onClick={() => getAiEvaluation(transcribedText)}
          disabled={!transcribedText.trim() || isUploading || isEvaluating}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#8b5cf6',
            color: '#fff',
            cursor: !transcribedText.trim() || isUploading || isEvaluating ? 'not-allowed' : 'pointer',
          }}
        >
          {aiFeedback ? '用修改后的文本重新评分' : '提交给 AI 教练'}
        </button>
        <span style={{ color: '#6b7280', fontSize: 13 }}>
          {textEdited ? '文本已修改，建议重新评分' : '识别不准确时可直接修改上面的文本'}
        </span>
      </div>

      {(isEvaluating || aiFeedback || aiError) && (
        <>
          <hr style={{ margin: '30px 0' }} />
          <h2>AI 教练反馈</h2>
        </>
      )}
      {isEvaluating && <p>🟡AI 教练正在批阅您的答卷...</p>}

      {aiError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
          }}
        >
          <span>{aiError}</span>
        </div>
      )}

      {aiFeedback && (
        <div>
          {savedInfo && (
            <p
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: 999,
                background: savedInfo.reviewList ? '#fee2e2' : '#dcfce7',
                color: savedInfo.reviewList ? '#b91c1c' : '#15803d',
                fontSize: 14,
              }}
            >
              {savedInfo.reviewList
                ? `得分低于 ${REVIEW_THRESHOLD}，已自动加入复习列表`
                : '已标记为已掌握'}
            </p>
          )}

          <div style={{ display: 'flex', gap: '2rem', marginTop: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ color: '#4c1d95' }}>AI 润色后的文本</h3>
              <p style={{ background: '#eef2ff', padding: '1rem', borderRadius: 10, whiteSpace: 'pre-wrap' }}>
                {aiFeedback.polishedText || '（模型没有返回润色文本）'}
              </p>

              <h3 style={{ color: '#4c1d95' }}>综合评价</h3>
              <p style={{ lineHeight: 1.7 }}>{aiFeedback.evaluation || '（模型没有返回评价）'}</p>

              {aiFeedback.strengths?.length > 0 && (
                <>
                  <h3 style={{ color: '#4c1d95' }}>优点 👍</h3>
                  <ul style={{ lineHeight: 1.8 }}>
                    {aiFeedback.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {aiFeedback.weaknesses?.length > 0 && (
                <>
                  <h3 style={{ color: '#4c1d95' }}>待改进 👇</h3>
                  <ul style={{ lineHeight: 1.8 }}>
                    {aiFeedback.weaknesses.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div style={{ flex: '0 0 150px', textAlign: 'center' }}>
              <h3 style={{ color: '#4c1d95' }}>综合得分</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: scoreColor }}>{aiFeedback.score}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>/ 100</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeynmanRecordPage;
