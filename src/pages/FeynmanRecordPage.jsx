import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { blobToBaiduWav } from '../utils/audio';

function FeynmanRecordPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kpTitle, setKpTitle] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl, blob) => {
      await uploadAudio(blob);
    }
  });

  // 获取知识点标题
  useEffect(() => {
    const fetchKpTitle = async () => {
      const res = await apiClient.get(`/knowledge-points/${id}`);
      setKpTitle(res.data.title);
    };
    fetchKpTitle();
  }, [id]);

  // 上传音频到后端接口
  const uploadAudio = async (audioBlob) => {
    setIsUploading(true);
    setTranscribedText('');
    try {
      // 浏览器录出来通常是 webm/opus，这里统一转成 16kHz 单声道 wav
      const { blob: wavBlob } = await blobToBaiduWav(audioBlob);
      const audioFile = new File([wavBlob], `record-${id}.wav`, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('knowledgePointId', id);

      const resp = await apiClient.post('/audio/transcribe', formData);
      setTranscribedText(resp.data.result);
    } catch (err) {
      console.error('上传转录失败：', err);
      const reason = err.response?.data?.msg || err.message;
      setTranscribedText(`转录失败：${reason}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '30px auto', padding: '0 20px' }}>
      <h1 style={{ color:'#5b21b6' }}>费曼复述：{kpTitle}</h1>
      <p>录音状态：{status}</p>

      <div style={{ margin:'20px 0', display:'flex', gap:'12px' }}>
        <button onClick={startRecording} disabled={status === 'recording'}
          style={{padding:'8px 16px', borderRadius:'8px', border:'none', background:'#22c55e', color:'#fff'}}>
          开始录音
        </button>
        <button onClick={stopRecording} disabled={status !== 'recording'}
          style={{padding:'8px 16px', borderRadius:'8px', border:'none', background:'#ef4444', color:'#fff'}}>
          停止录音
        </button>
        <button onClick={()=>navigate('/')}
          style={{padding:'8px 16px', borderRadius:'8px', border:'1px solid #aaa', background:'#fff'}}>
          返回仪表盘
        </button>
      </div>

      {/* 回放音频，自闭合标签 */}
      {mediaBlobUrl && (
        <div style={{margin:'12px 0'}}>
          <p>录音回放：</p>
          <audio src={mediaBlobUrl} controls />
        </div>
      )}

      <hr style={{margin:'30px 0'}} />

      <h2>AI语音转录结果</h2>
      {isUploading && <p>🟡正在上传音频并调用百度语音识别，请稍候...</p>}
      <div style={{border:'1px solid #ccc', padding:'16px', minHeight:'120px', borderRadius:'8px'}}>
        {transcribedText || '转录后的文字会显示在这里'}
      </div>
    </div>
  );
}

export default FeynmanRecordPage;
