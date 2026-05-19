import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureError, trackEvent } from './telemetry';

describe('telemetry', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores tracked events in localStorage', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    trackEvent('player_open', { contentId: 'sleep-story-interstellar-v1' });

    const records = JSON.parse(window.localStorage.getItem('shimei:telemetry-events') ?? '[]');
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('player_open');
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it('stores captured errors in localStorage', () => {
    captureError('player.play', new Error('blocked'), { contentId: 'sleep-story-interstellar-v1' });

    const records = JSON.parse(window.localStorage.getItem('shimei:telemetry-errors') ?? '[]');
    expect(records).toHaveLength(1);
    expect(records[0].source).toBe('player.play');
    expect(records[0].message).toBe('blocked');
  });
});
