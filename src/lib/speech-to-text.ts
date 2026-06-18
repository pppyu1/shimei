type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechTranscriptUpdate {
  interim: string;
  finalSegment: string;
}

export interface DreamSpeechRecognizerOptions {
  lang?: string;
  onTranscript?: (update: SpeechTranscriptUpdate) => void;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEmpty?: () => void;
  onStateChange?: (listening: boolean) => void;
}

export interface DreamSpeechRecognizer {
  start: () => Promise<void>;
  stop: () => void;
  isActive: () => boolean;
}

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const win = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
};

export const supportsSpeechRecognition = () =>
  import.meta.env.VITE_VOLCENGINE_SPEECH === 'true' || Boolean(getSpeechRecognitionCtor());

export const supportsMicrophoneCapture = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

export const mapSpeechRecognitionError = (code: string) => {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风。';
    case 'no-speech':
      return '没有检测到语音，请靠近麦克风后重试。';
    case 'audio-capture':
      return '无法访问麦克风，请确认设备已连接且未被其他应用占用。';
    case 'network':
      return '语音识别需要网络连接，请检查网络后重试。';
    case 'aborted':
      return '语音识别已停止。';
    default:
      return '语音识别失败，请重试。';
  }
};

export const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const appendTranscriptParagraph = (html: string, transcript: string) => {
  const trimmed = transcript.trim();
  if (!trimmed) return html;
  const paragraph = `<p>${escapeHtml(trimmed)}</p>`;
  return html ? `${html}${paragraph}` : paragraph;
};

export const buildSpeechEditorHtml = (baseHtml: string, finalizedSegments: string[], interimText: string) => {
  const finalizedHtml = finalizedSegments
    .filter((segment) => segment.trim())
    .map((segment) => `<p>${escapeHtml(segment.trim())}</p>`)
    .join('');
  const interim = interimText.trim()
    ? `<p data-speech-interim="true" class="opacity-60 italic">${escapeHtml(interimText.trim())}</p>`
    : '';
  return `${baseHtml || ''}${finalizedHtml}${interim}`;
};

export const parseSpeechTranscriptEvent = (event: SpeechRecognitionEventLike): SpeechTranscriptUpdate => {
  let finalSegment = '';
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (!result?.isFinal) continue;
    finalSegment += result[0]?.transcript ?? '';
  }

  let interim = '';
  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (result?.isFinal) continue;
    interim += result[0]?.transcript ?? '';
  }

  return {
    interim,
    finalSegment: finalSegment.trim(),
  };
};

export const requestMicrophonePermission = async () => {
  if (!supportsMicrophoneCapture()) {
    throw new Error('当前浏览器不支持麦克风录音。');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return stream;
};

export const createDreamSpeechRecognizer = (options: DreamSpeechRecognizerOptions = {}): DreamSpeechRecognizer => {
  const SpeechRecognitionClass = getSpeechRecognitionCtor();
  if (!SpeechRecognitionClass) {
    throw new Error('当前浏览器不支持语音转文字。请使用 Chrome 或 Edge。');
  }

  let recognition: SpeechRecognitionInstance | null = null;
  let mediaStream: MediaStream | null = null;
  let active = false;
  let stopping = false;
  let restartTimer: number | null = null;

  const clearRestartTimer = () => {
    if (restartTimer !== null) {
      window.clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const releaseMic = () => {
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  };

  const setActive = (next: boolean) => {
    active = next;
    options.onStateChange?.(next);
  };

  const emitTranscript = (update: SpeechTranscriptUpdate) => {
    options.onTranscript?.(update);
    if (update.interim) {
      options.onInterim?.(update.interim);
    }
    if (update.finalSegment) {
      options.onFinal?.(update.finalSegment);
    }
  };

  const destroyRecognition = () => {
    clearRestartTimer();
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.onstart = null;
    try {
      recognition.abort();
    } catch {
      // ignore abort errors during cleanup
    }
    recognition = null;
  };

  const attachRecognitionHandlers = (instance: SpeechRecognitionInstance) => {
    instance.onstart = () => {
      stopping = false;
      setActive(true);
    };

    instance.onresult = (event) => {
      emitTranscript(parseSpeechTranscriptEvent(event));
    };

    instance.onerror = (event) => {
      if (event.error === 'aborted' && stopping) {
        return;
      }

      if (event.error === 'no-speech' && active) {
        emitTranscript({ interim: '', finalSegment: '' });
        return;
      }

      setActive(false);
      options.onError?.(mapSpeechRecognitionError(event.error));
    };

    instance.onend = () => {
      if (stopping) {
        stopping = false;
        setActive(false);
        emitTranscript({ interim: '', finalSegment: '' });
        return;
      }

      if (!active || !recognition) {
        emitTranscript({ interim: '', finalSegment: '' });
        return;
      }

      clearRestartTimer();
      restartTimer = window.setTimeout(() => {
        if (!active || stopping || !recognition) return;
        try {
          recognition.start();
        } catch {
          setActive(false);
          options.onError?.('语音识别已中断，请重新开始。');
        }
      }, 150);
    };
  };

  const createRecognition = () => {
    destroyRecognition();
    const instance = new SpeechRecognitionClass();
    instance.lang = options.lang ?? 'zh-CN';
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    attachRecognitionHandlers(instance);
    recognition = instance;
    return instance;
  };

  return {
    isActive: () => active,
    start: async () => {
      if (active) return;

      clearRestartTimer();
      stopping = false;
      releaseMic();
      mediaStream = await requestMicrophonePermission();
      const instance = createRecognition();

      try {
        instance.start();
      } catch {
        destroyRecognition();
        releaseMic();
        setActive(false);
        throw new Error('无法启动语音识别，请稍后重试。');
      }
    },
    stop: () => {
      stopping = true;
      clearRestartTimer();
      setActive(false);
      emitTranscript({ interim: '', finalSegment: '' });

      if (recognition) {
        try {
          recognition.stop();
        } catch {
          destroyRecognition();
        }
      }

      window.setTimeout(() => {
        destroyRecognition();
        releaseMic();
      }, 0);
    },
  };
};
