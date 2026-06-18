export type SpeechProviderMode = 'asr' | 'ark-speech' | 'ark-only' | 'none';

export interface SpeechProviderConfig {
  mode: SpeechProviderMode;
  configured: boolean;
  message: string;
  arkApiKey: string;
  arkSpeechModel: string;
  asrAppKey: string;
  asrAccessKey: string;
  asrResourceId: string;
}

export const getSpeechProviderConfig = (env: Record<string, string>): SpeechProviderConfig => {
  const arkApiKey = env.VOLCENGINE_ARK_API_KEY?.trim() ?? '';
  const arkSpeechModel = env.VOLCENGINE_ARK_SPEECH_MODEL?.trim() || 'doubao-seed-2-0-mini-260428';
  const asrAppKey = env.VOLCENGINE_ASR_APP_KEY?.trim() ?? '';
  const asrAccessKey = env.VOLCENGINE_ASR_ACCESS_KEY?.trim() ?? '';
  const asrResourceId = env.VOLCENGINE_ASR_RESOURCE_ID?.trim() || 'volc.seedasr.sauc.duration';

  if (asrAppKey && asrAccessKey) {
    return {
      mode: 'asr',
      configured: true,
      message: '已配置豆包流式语音识别 2.0（App Key + Access Key）。',
      arkApiKey,
      arkSpeechModel,
      asrAppKey,
      asrAccessKey,
      asrResourceId,
    };
  }

  if (arkApiKey) {
    return {
      mode: 'ark-speech',
      configured: true,
      message: `已配置 Ark 语音模型 ${arkSpeechModel}。若模型未开通，请在火山方舟控制台激活。`,
      arkApiKey,
      arkSpeechModel,
      asrAppKey,
      asrAccessKey,
      asrResourceId,
    };
  }

  return {
    mode: 'none',
    configured: false,
    message: '未配置语音识别凭证。',
    arkApiKey,
    arkSpeechModel,
    asrAppKey,
    asrAccessKey,
    asrResourceId,
  };
};

const extractChatText = (content: unknown): string => {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      const candidate = part as { text?: string };
      return typeof candidate.text === 'string' ? candidate.text : '';
    })
    .join('\n')
    .trim();
};

const EMPTY_TRANSCRIPT_PATTERNS = [
  /^无(?:转写内容|语音(?:内容)?)?[。.!?…]*$/u,
  /^（无(?:转写内容|语音(?:内容)?)?）$/u,
  /^\(无(?:转写内容|语音(?:内容)?)?\)$/u,
  /^未检测到有效语音内容[。.!?…]*$/u,
  /^没有(?:检测到|识别到)语音[。.!?…]*$/u,
  /^静音[。.!?…]*$/u,
  /^\[SOI\]/u,
  /^N\/A$/iu,
];

export const normalizeTranscriptText = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (EMPTY_TRANSCRIPT_PATTERNS.some((pattern) => pattern.test(trimmed))) return '';
  return trimmed;
};

export const transcribeWithArkSpeech = async (
  config: SpeechProviderConfig,
  audioBase64: string,
  format: 'wav' | 'mp3' | 'ogg' | 'pcm' = 'wav',
) => {
  if (!config.arkApiKey) {
    throw new Error('未配置 VOLCENGINE_ARK_API_KEY。');
  }

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.arkApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.arkSpeechModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '将这段中文语音逐字转写为纯文本。只输出听到的文字，不要解释。若完全静音则返回空字符串，禁止输出「无」「未检测到有效语音内容」等占位说明。' },
            { type: 'input_audio', input_audio: { data: audioBase64, format } },
          ],
        },
      ],
    }),
  });

  const logId = response.headers.get('x-tt-logid') ?? undefined;
  const bodyText = await response.text();

  if (!response.ok) {
    let message = `Ark 语音识别失败（HTTP ${response.status}）`;
    try {
      const payload = JSON.parse(bodyText) as { error?: { message?: string } };
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const payload = JSON.parse(bodyText) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const text = normalizeTranscriptText(extractChatText(payload.choices?.[0]?.message?.content));

  return { text, logId };
};

export const transcribeSpeechAudio = async (
  config: SpeechProviderConfig,
  audioBase64: string,
  format: 'wav' | 'mp3' | 'ogg' | 'pcm' = 'wav',
) => {
  if (!config.configured) {
    throw new Error(config.message);
  }

  if (config.mode === 'asr') {
    const { transcribeWithVolcengineFlash } = await import('./volcengine-asr');
    return transcribeWithVolcengineFlash(
      {
        appKey: config.asrAppKey,
        accessKey: config.asrAccessKey,
        resourceId: config.asrResourceId,
        mode: 'asr',
        configured: true,
        message: config.message,
      },
      audioBase64,
      format,
    );
  }

  return transcribeWithArkSpeech(config, audioBase64, format);
};
