import { describe, expect, it } from 'vitest';
import {
  buildVolcengineStartFrame,
  extractVolcengineTranscript,
  parseVolcengineTranscriptUpdate,
} from './volcengine-asr-protocol';

describe('volcengine asr protocol', () => {
  it('builds a start frame with json payload', () => {
    const frame = buildVolcengineStartFrame({ sequence: 1, userId: 'demo-user' });
    expect(frame.length).toBeGreaterThan(16);
    expect(frame[0]).toBe(0x11);
  });

  it('extracts transcript text from server payload', () => {
    expect(
      extractVolcengineTranscript({
        result: { text: '我梦见在海上飞行' },
      }),
    ).toBe('我梦见在海上飞行');
  });

  it('splits interim and final transcript updates', () => {
    const interim = parseVolcengineTranscriptUpdate({ result: { text: '我梦见' } }, false, '');
    expect(interim.interim).toBe('我梦见');
    expect(interim.finalSegment).toBe('');

    const finalUpdate = parseVolcengineTranscriptUpdate(
      {
        result: {
          text: '我梦见在海上飞行',
          utterances: [{ definite: true, text: '我梦见在海上飞行' }],
        },
      },
      true,
      '',
    );
    expect(finalUpdate.finalSegment).toBe('我梦见在海上飞行');
  });
});
