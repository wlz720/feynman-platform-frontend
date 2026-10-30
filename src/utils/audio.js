// 浏览器录音（webm/opus、mp4/aac 等）转成百度短语音要求的 16000Hz / 单声道 / 16bit PCM WAV

function encodeWav(channelData, sampleRate) {
  const samples = channelData.length;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);

  let offset = 44;
  for (let i = 0; i < samples; i += 1) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export async function blobToBaiduWav(blob, { sampleRate = 16000, maxSeconds = 60 } = {}) {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  let decoded;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close();
  }

  if (decoded.duration > maxSeconds) {
    throw new Error(`录音 ${decoded.duration.toFixed(1)} 秒，超过百度短语音 ${maxSeconds} 秒上限`);
  }

  const frames = Math.ceil(decoded.duration * sampleRate);
  const offline = new OfflineAudioContext(1, frames, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();

  return {
    blob: encodeWav(rendered.getChannelData(0), sampleRate),
    duration: rendered.duration
  };
}
