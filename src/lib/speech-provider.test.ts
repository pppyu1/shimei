import { describe, expect, it } from 'vitest';
import { getSpeechProviderConfig, normalizeTranscriptText } from '../../server/speech-provider';

describe('speech provider config', () => {
  it('uses dedicated openspeech credentials when available', () => {
    const config = getSpeechProviderConfig({
      VOLCENGINE_ASR_APP_KEY: '123456789',
      VOLCENGINE_ASR_ACCESS_KEY: 'speech-token',
    });
    expect(config.mode).toBe('asr');
    expect(config.configured).toBe(true);
  });

  it('uses ark speech model when only ark key is configured', () => {
    const config = getSpeechProviderConfig({
      VOLCENGINE_ARK_API_KEY: 'ark-demo-key',
      VOLCENGINE_ARK_SPEECH_MODEL: 'doubao-seed-2-0-mini-260428',
    });
    expect(config.mode).toBe('ark-speech');
    expect(config.configured).toBe(true);
    expect(config.arkSpeechModel).toBe('doubao-seed-2-0-mini-260428');
  });

  it('filters empty transcript placeholders from model output', () => {
    expect(normalizeTranscriptText('无')).toBe('');
    expect(normalizeTranscriptText('（无转写内容）')).toBe('');
    expect(normalizeTranscriptText('未检测到有效语音内容')).toBe('');
    expect(normalizeTranscriptText('我梦见在海边飞行')).toBe('我梦见在海边飞行');
  });
});
