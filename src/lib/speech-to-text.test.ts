import { describe, expect, it } from 'vitest';
import {
  appendTranscriptParagraph,
  buildSpeechEditorHtml,
  escapeHtml,
  mapSpeechRecognitionError,
  parseSpeechTranscriptEvent,
  supportsSpeechRecognition,
} from './speech-to-text';

describe('speech-to-text utilities', () => {
  it('detects speech support based on runtime capabilities', () => {
    expect(typeof supportsSpeechRecognition()).toBe('boolean');
  });

  it('maps common speech errors to user-facing messages', () => {
    expect(mapSpeechRecognitionError('not-allowed')).toContain('麦克风权限');
    expect(mapSpeechRecognitionError('network')).toContain('网络');
    expect(mapSpeechRecognitionError('unknown')).toContain('语音识别失败');
  });

  it('escapes html in transcripts', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('appends transcript paragraphs safely', () => {
    expect(appendTranscriptParagraph('', '我梦见飞行')).toBe('<p>我梦见飞行</p>');
    expect(appendTranscriptParagraph('<p>已有内容</p>', '新的片段')).toBe('<p>已有内容</p><p>新的片段</p>');
    expect(appendTranscriptParagraph('<p>已有内容</p>', '   ')).toBe('<p>已有内容</p>');
  });

  it('builds editor html with finalized and interim segments', () => {
    expect(buildSpeechEditorHtml('', ['我梦见飞行'], '正在说')).toContain('我梦见飞行');
    expect(buildSpeechEditorHtml('', ['我梦见飞行'], '正在说')).toContain('data-speech-interim="true"');
    expect(buildSpeechEditorHtml('', ['我梦见飞行'], '正在说')).toContain('正在说');
  });

  it('parses interim and final transcript segments from speech events', () => {
    const update = parseSpeechTranscriptEvent({
      resultIndex: 1,
      results: {
        length: 3,
        0: { isFinal: true, 0: { transcript: '我梦见' } },
        1: { isFinal: true, 0: { transcript: '在海上飞行' } },
        2: { isFinal: false, 0: { transcript: '还看到了' } },
      },
    });

    expect(update.finalSegment).toBe('在海上飞行');
    expect(update.interim).toBe('还看到了');
  });
});
