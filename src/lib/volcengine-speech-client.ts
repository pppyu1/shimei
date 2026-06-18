import type { DreamSpeechRecognizer, DreamSpeechRecognizerOptions } from './speech-to-text';

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_MS = 1500;
const MIN_SAMPLES_LIVE = TARGET_SAMPLE_RATE / 2;
const MIN_SAMPLES_FINAL = TARGET_SAMPLE_RATE / 4;
const MAX_WINDOW_SECONDS = 12;
const MIN_AUDIO_RMS = 0.003;
const TARGET_AUDIO_RMS = 0.08;

export interface SpeechProviderStatus {
  provider: string;
  configured: boolean;
  mode: 'asr' | 'ark-speech' | 'ark-only' | 'none' | string;
  model?: string;
  message: string;
}

const resampleTo16k = (input: Float32Array, inputRate: number) => {
  if (inputRate === TARGET_SAMPLE_RATE) return input;
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = sourceIndex - left;
    const sampleLeft = input[left] ?? 0;
    const sampleRight = input[right] ?? sampleLeft;
    output[index] = sampleLeft + (sampleRight - sampleLeft) * fraction;
  }
  return output;
};

const computeRms = (samples: Float32Array) => {
  if (!samples.length) return 0;
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples.length);
};

const normalizeAudioLevel = (samples: Float32Array) => {
  const rms = computeRms(samples);
  if (rms < 0.0005) return samples;
  const gain = Math.min(24, TARGET_AUDIO_RMS / rms);
  if (gain <= 1.05) return samples;
  const normalized = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    normalized[index] = Math.max(-1, Math.min(1, (samples[index] ?? 0) * gain));
  }
  return normalized;
};

const float32ToPcmInt16 = (samples: Float32Array) => {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm;
};

const encodeWavBase64 = (samples: Float32Array) => {
  const pcm = float32ToPcmInt16(samples);
  const buffer = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(pcm.buffer));

  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const isVolcengineSpeechEnabled = () => import.meta.env.VITE_VOLCENGINE_SPEECH === 'true';

export const fetchSpeechProviderStatus = async (): Promise<SpeechProviderStatus> => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  try {
    const response = await fetch('/api/speech/status');
    if (!response.ok) {
      return {
        provider: 'browser',
        configured: false,
        mode: 'none',
        message: `语音识别代理不可用（HTTP ${response.status}）。请确认已用 npm run dev 打开 http://localhost:3000，当前地址：${origin}`,
      };
    }
    return (await response.json()) as SpeechProviderStatus;
  } catch {
    return {
      provider: 'browser',
      configured: false,
      mode: 'none',
      message: `未检测到服务端语音识别代理。请用 npm run dev 启动后访问 http://localhost:3000，当前地址：${origin}`,
    };
  }
};

export type ResolvedSpeechProvider = {
  mode: 'browser' | 'asr' | 'ark-speech';
  status: SpeechProviderStatus | null;
};

export const resolveSpeechProvider = async (): Promise<ResolvedSpeechProvider> => {
  if (!isVolcengineSpeechEnabled()) {
    return { mode: 'browser', status: null };
  }

  const status = await fetchSpeechProviderStatus();
  if (status.configured && status.mode === 'asr') {
    return { mode: 'asr', status };
  }
  if (status.configured && status.mode === 'ark-speech') {
    return { mode: 'ark-speech', status };
  }
  return { mode: 'browser', status };
};

export const getSpeechListeningStatus = (provider: ResolvedSpeechProvider) => {
  if (provider.mode === 'ark-speech') {
    return `火山方舟正在聆听（${provider.status?.model ?? 'Ark 语音模型'}），请开始描述你的梦境…`;
  }
  if (provider.mode === 'asr') {
    return '豆包流式语音识别 2.0 正在聆听，请开始描述你的梦境…';
  }
  if (isVolcengineSpeechEnabled() && provider.status) {
    return `正在聆听（浏览器备用）。${provider.status.message}`;
  }
  return '正在聆听，请开始描述你的梦境…';
};

export const getSpeechProviderLabel = (provider: ResolvedSpeechProvider) => {
  if (!isVolcengineSpeechEnabled()) {
    return '语音识别：浏览器 Web Speech API';
  }
  if (provider.mode === 'ark-speech') {
    return `语音识别：火山方舟 · ${provider.status?.model ?? 'Ark'}`;
  }
  if (provider.mode === 'asr') {
    return '语音识别：豆包流式语音识别 2.0';
  }
  return '语音识别：浏览器备用（火山方舟未连接）';
};

export const checkVolcengineSpeechConfigured = async () => {
  const status = await fetchSpeechProviderStatus();
  return status.configured && (status.mode === 'asr' || status.mode === 'ark-speech');
};

const transcribeChunk = async (samples: Float32Array) => {
  const response = await fetch('/api/speech/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: encodeWavBase64(samples),
      format: 'wav',
    }),
  });

  const payload = (await response.json()) as { text?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || '语音识别失败');
  }
  return payload.text?.trim() ?? '';
};

const mergeNativeSamples = (chunks: Float32Array[]) => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
};

const buildTranscriptionSamples = (
  nativeSampleChunks: Float32Array[],
  captureSampleRate: number,
  finalize: boolean,
) => {
  const mergedNative = mergeNativeSamples(nativeSampleChunks);
  if (!mergedNative.length) return mergedNative;
  const resampled = resampleTo16k(mergedNative, captureSampleRate);
  const normalized = normalizeAudioLevel(resampled);
  if (finalize) return normalized;
  const maxWindow = TARGET_SAMPLE_RATE * MAX_WINDOW_SECONDS;
  if (normalized.length <= maxWindow) return normalized;
  return normalized.slice(normalized.length - maxWindow);
};

export const createVolcengineDreamSpeechRecognizer = (
  options: DreamSpeechRecognizerOptions = {},
): DreamSpeechRecognizer => {
  let active = false;
  let stopping = false;
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silentGain: GainNode | null = null;
  let nativeSampleChunks: Float32Array[] = [];
  let captureSampleRate = TARGET_SAMPLE_RATE;
  let lastRecognizedText = '';
  let transcribeTimer: number | null = null;
  let transcribeInFlight = false;

  const setActive = (next: boolean) => {
    active = next;
    options.onStateChange?.(next);
  };

  const emitTranscript = (update: { interim: string; finalSegment: string }) => {
    options.onTranscript?.(update);
    if (update.interim) options.onInterim?.(update.interim);
    if (update.finalSegment) options.onFinal?.(update.finalSegment);
  };

  const appendSamples = (samples: Float32Array) => {
    nativeSampleChunks.push(samples);
  };

  const runTranscription = async (finalize = false) => {
    if (transcribeInFlight) return;
    if (!finalize && !active) return;

    const samples = buildTranscriptionSamples(nativeSampleChunks, captureSampleRate, finalize);
    const minSamples = finalize ? MIN_SAMPLES_FINAL : MIN_SAMPLES_LIVE;
    if (samples.length < minSamples) {
      if (finalize && lastRecognizedText) {
        emitTranscript({ interim: '', finalSegment: lastRecognizedText });
      }
      return;
    }

    const rms = computeRms(samples);
    if (rms < MIN_AUDIO_RMS) {
      if (finalize) {
        if (lastRecognizedText) {
          emitTranscript({ interim: '', finalSegment: lastRecognizedText });
        } else {
          options.onEmpty?.();
        }
      }
      return;
    }

    transcribeInFlight = true;
    try {
      const text = await transcribeChunk(samples);
      if (text) {
        if (finalize) {
          emitTranscript({ interim: '', finalSegment: text });
        } else {
          emitTranscript({ interim: text, finalSegment: '' });
        }
        lastRecognizedText = text;
      } else if (finalize) {
        if (lastRecognizedText) {
          emitTranscript({ interim: '', finalSegment: lastRecognizedText });
        } else {
          options.onEmpty?.();
        }
      }
    } catch (error) {
      if (!finalize) setActive(false);
      options.onError?.(error instanceof Error ? error.message : '火山引擎语音识别失败');
    } finally {
      transcribeInFlight = false;
    }
  };

  const cleanupAudio = () => {
    if (transcribeTimer !== null) {
      window.clearInterval(transcribeTimer);
      transcribeTimer = null;
    }
    processor?.disconnect();
    silentGain?.disconnect();
    processor = null;
    silentGain = null;
    audioContext?.close().catch(() => undefined);
    audioContext = null;
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    nativeSampleChunks = [];
    lastRecognizedText = '';
  };

  const startAudioCapture = async () => {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
      },
    });
    audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    captureSampleRate = audioContext.sampleRate;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(mediaStream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    silentGain = audioContext.createGain();
    silentGain.gain.value = 0;

    processor.onaudioprocess = (event) => {
      if (stopping) return;
      appendSamples(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    transcribeTimer = window.setInterval(() => {
      void runTranscription(false);
    }, CHUNK_MS);
  };

  return {
    isActive: () => active,
    start: async () => {
      if (active) return;
      stopping = false;
      cleanupAudio();
      setActive(true);
      await startAudioCapture();
    },
    stop: () => {
      if (!active) return;
      stopping = true;
      void runTranscription(true).finally(() => {
        setActive(false);
        cleanupAudio();
        stopping = false;
        emitTranscript({ interim: '', finalSegment: '' });
      });
    },
  };
};
