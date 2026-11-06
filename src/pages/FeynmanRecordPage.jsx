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
  const [isUploading, setIsUploading] = useState(false);

  const [aiFeedback, setAiFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');

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

  // 转录完成后调用：先取原始知识点，再交给大模型润色 + 评价
  const getAiEvaluation = useCallback(
    async (transcribed) => {
      setIsEvaluating(true);
      setAiFeedback(null);
      setAiError('');
      setStatusNotice('');
      try {
        const kpResponse = await apiClient.get(`/knowledge-points/${id}`);
        const originalContent = kpResponse.data.content;

        const feedbackResponse = await apiClient.post('/audio/evaluate', {
          originalContent,
          transcribedText: transcribed,
        });
        setAiFeedback(feedbackResponse.data);

        // 评分结果回写知识点：低于阈值自动进入复习列表
        try {
          const saved = await apiClient.post(`/knowledge-points/${id}/evaluate-result`, {
            score: feedbackResponse.data.score,
          });
          setStatusNotice(
            saved.data.reviewList
              ? `得分低于 ${REVIEW_THRESHOLD}，已自动加入复习列表`
              : '已标记为已掌握'
          );
        } catch (err) {
          console.error('回写评价结果失败：', err);
        }
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
      setAiFeedback(null);
      setAiError('');
      setStatusNotice('');
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
        const reason = err.response?.data?.msg || err.message;
        setTranscribedText(`转录失败：${reason}`);
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
    setAiFeedback(null);
    setAiError('');
    setStatusNotice('');
    startRecording();
  };

  const scoreColor =
    aiFeedback?.score >= 80 ? '#16a34a' : aiFeedback?.score >= REVIEW_THRESHOLD ? '#f59e0b' : '#dc2626';

  return (
    <div style={{ maxWidth: 860, margin: '30px auto', padding: '0 20px' }}>
      <h1 style={{ color: '#5b21b6' }}>费曼复述：{kpTitle}</h1>
      <p>录音状态：{status}</p>

      <div style={{ margin: '20px 0', display: 'flex', gap: '12px' }}>
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
      <div style={{ border: '1px solid #ccc', padding: '16px', minHeight: '120px', borderRadius: '8px' }}>
        {transcribedText || '转录后的文字会显示在这里'}
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
          {transcribedText && !transcribedText.startsWith('转录失败') && (
            <button
              onClick={() => getAiEvaluation(transcribedText)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid #dc2626',
                background: '#fff',
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
          )}
        </div>
      )}

      {aiFeedback && (
        <div>
          {statusNotice && (
            <p
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: 999,
                background: aiFeedback.score < REVIEW_THRESHOLD ? '#fee2e2' : '#dcfce7',
                color: aiFeedback.score < REVIEW_THRESHOLD ? '#b91c1c' : '#15803d',
                fontSize: 14,
              }}
            >
              {statusNotice}
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
