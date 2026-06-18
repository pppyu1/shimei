import { randomUUID } from 'node:crypto';
import { getSpeechProviderConfig } from './speech-provider';

export interface VolcengineAsrCredentials {
  appKey: string;
  accessKey: string;
  resourceId: string;
  mode: 'asr' | 'ark-only' | 'none';
  configured: boolean;
  message: string;
}

/** @deprecated Use getSpeechProviderConfig from ./speech-provider instead. */
export const getVolcengineAsrCredentials = (env: Record<string, string>): VolcengineAsrCredentials => {
  const config = getSpeechProviderConfig(env);
  if (config.mode === 'asr') {
    return {
      appKey: config.asrAppKey,
      accessKey: config.asrAccessKey,
      resourceId: config.asrResourceId,
      mode: 'asr',
      configured: true,
      message: config.message,
    };
  }

  if (config.mode === 'ark-speech') {
    return {
      appKey: config.arkApiKey,
      accessKey: config.arkApiKey,
      resourceId: config.asrResourceId,
      mode: 'ark-only',
      configured: false,
      message: config.message,
    };
  }

  return {
    appKey: '',
    accessKey: '',
    resourceId: config.asrResourceId,
    mode: 'none',
    configured: false,
    message: config.message,
  };
};

export interface VolcengineFlashTranscript {
  text: string;
  logId?: string;
}

export const transcribeWithVolcengineFlash = async (
  credentials: VolcengineAsrCredentials,
  audioBase64: string,
  format: 'wav' | 'mp3' | 'ogg' | 'pcm' = 'wav',
): Promise<VolcengineFlashTranscript> => {
  if (!credentials.configured || credentials.mode !== 'asr') {
    throw new Error(credentials.message);
  }

  const requestId = randomUUID();
  const response = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-App-Key': credentials.appKey,
      'X-Api-Access-Key': credentials.accessKey,
      'X-Api-Resource-Id': credentials.resourceId,
      'X-Api-Request-Id': requestId,
      'X-Api-Sequence': '-1',
    },
    body: JSON.stringify({
      user: { uid: credentials.appKey },
      audio: { data: audioBase64, format },
      request: {
        model_name: 'bigmodel',
        enable_itn: true,
        enable_punc: true,
      },
    }),
  });

  const statusCode = response.headers.get('X-Api-Status-Code') ?? '';
  const apiMessage = response.headers.get('X-Api-Message') ?? '';
  const logId = response.headers.get('X-Tt-Logid') ?? undefined;
  const bodyText = await response.text();

  if (statusCode && statusCode !== '20000000') {
    throw new Error(apiMessage || `火山引擎语音识别失败（${statusCode}）`);
  }

  if (!response.ok) {
    throw new Error(apiMessage || `火山引擎语音识别请求失败（HTTP ${response.status}）`);
  }

  let payload: { result?: { text?: string } } = {};
  try {
    payload = JSON.parse(bodyText) as { result?: { text?: string } };
  } catch {
    throw new Error('火山引擎返回了无法解析的识别结果。');
  }

  return {
    text: payload.result?.text?.trim() ?? '',
    logId,
  };
};
