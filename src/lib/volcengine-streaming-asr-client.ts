import {
  buildVolcengineAudioFrame,
  buildVolcengineStartFrame,
  parseVolcengineServerPacket,
  parseVolcengineTranscriptUpdate,
  toWebSocketBuffer,
} from './volcengine-asr-protocol';
import type { DreamSpeechRecognizer, DreamSpeechRecognizerOptions } from './speech-to-text';

const TARGET_SAMPLE_RATE = 16000;
const SEND_INTERVAL_MS = 200;
const SEND_SAMPLE_COUNT = (TARGET_SAMPLE_RATE * SEND_INTERVAL_MS) / 1000;

const getSpeechWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/speech/ws`;
};

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

const float32ToPcmBytes = (samples: Float32Array) => {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(pcm.buffer);
};

export const createVolcengineStreamingAsrRecognizer = (
  options: DreamSpeechRecognizerOptions = {},
): DreamSpeechRecognizer => {
  let active = false;
  let stopping = false;
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silentGain: GainNode | null = null;
  let captureSampleRate = TARGET_SAMPLE_RATE;
  let pendingSamples = new Float32Array(0);
  let sendTimer: number | null = null;
  let ws: WebSocket | null = null;
  let sequence = 1;
  let lastFinalText = '';

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
    const merged = new Float32Array(pendingSamples.length + samples.length);
    merged.set(pendingSamples, 0);
    merged.set(samples, pendingSamples.length);
    pendingSamples = merged;
  };

  const drainPcmChunk = (finalize = false) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const chunkSampleCount = finalize ? pendingSamples.length : SEND_SAMPLE_COUNT;
    if (pendingSamples.length < chunkSampleCount && !finalize) return;
    if (pendingSamples.length === 0 && finalize) return;

    const chunk = pendingSamples.slice(0, chunkSampleCount);
    pendingSamples = pendingSamples.slice(chunkSampleCount);
    const pcmBytes = float32ToPcmBytes(chunk);

    sequence += 1;
    ws.send(
      toWebSocketBuffer(
        buildVolcengineAudioFrame({
          sequence,
          audioBytes: pcmBytes,
          isFinal: finalize,
        }),
      ),
    );
  };

  const handleServerPacket = async (data: Blob | ArrayBuffer) => {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    const packet = await parseVolcengineServerPacket(buffer);
    if (packet.type === 'error') {
      setActive(false);
      options.onError?.(packet.message);
      return;
    }
    if (packet.type !== 'response') return;

    const update = parseVolcengineTranscriptUpdate(packet.data, packet.isFinal, lastFinalText);
    if (update.finalSegment) {
      lastFinalText += update.finalSegment;
    }
    emitTranscript(update);
  };

  const cleanupAudio = () => {
    if (sendTimer !== null) {
      window.clearInterval(sendTimer);
      sendTimer = null;
    }
    processor?.disconnect();
    silentGain?.disconnect();
    processor = null;
    silentGain = null;
    audioContext?.close().catch(() => undefined);
    audioContext = null;
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    pendingSamples = new Float32Array(0);
    lastFinalText = '';
    sequence = 1;
  };

  const closeWebSocket = () => {
    if (!ws) return;
    const socket = ws;
    ws = null;
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
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
      const input = event.inputBuffer.getChannelData(0);
      appendSamples(resampleTo16k(new Float32Array(input), captureSampleRate));
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    sendTimer = window.setInterval(() => {
      drainPcmChunk(false);
    }, SEND_INTERVAL_MS);
  };

  const connectWebSocket = () =>
    new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(getSpeechWebSocketUrl());
      ws = socket;
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        sequence = 1;
        socket.send(
          toWebSocketBuffer(
            buildVolcengineStartFrame({
              sequence,
              userId: 'shimei-dream-journal',
            }),
          ),
        );
        resolve();
      };

      socket.onmessage = (event) => {
        void handleServerPacket(event.data as Blob | ArrayBuffer);
      };

      socket.onerror = () => {
        reject(new Error('豆包流式语音识别连接失败，请确认已在 .env.local 配置 Access Token 并重启 dev 服务器。'));
      };

      socket.onclose = (event) => {
        if (!stopping && active && event.code !== 1000) {
          options.onError?.('豆包流式语音识别连接已断开，请重试。');
          setActive(false);
        }
      };
    });

  return {
    isActive: () => active,
    start: async () => {
      if (active) return;
      stopping = false;
      cleanupAudio();
      closeWebSocket();
      await connectWebSocket();
      await startAudioCapture();
      setActive(true);
    },
    stop: () => {
      if (!active) return;
      stopping = true;
      drainPcmChunk(true);
      const hadText = lastFinalText.trim();
      setActive(false);
      window.setTimeout(() => {
        cleanupAudio();
        closeWebSocket();
        stopping = false;
        emitTranscript({ interim: '', finalSegment: '' });
        if (!hadText) {
          options.onEmpty?.();
        }
      }, 600);
    },
  };
};
