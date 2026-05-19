import { describe, expect, it } from 'vitest';
import { buildHashRoute, parseHashRoute } from './routing';

describe('routing', () => {
  it('builds main view hash', () => {
    expect(buildHashRoute({ view: 'nature', playerContentId: null })).toBe('#/nature');
  });

  it('builds player deep link hash', () => {
    expect(buildHashRoute({ view: 'home', playerContentId: 'sleep-story-interstellar-v1' })).toBe(
      '#/home/player/sleep-story-interstellar-v1',
    );
  });

  it('parses empty hash to home route', () => {
    expect(parseHashRoute('')).toEqual({ view: 'home', playerContentId: null });
  });

  it('parses player deep link', () => {
    expect(parseHashRoute('#/me/player/sleep-story-interstellar-v1')).toEqual({
      view: 'me',
      playerContentId: 'sleep-story-interstellar-v1',
    });
  });

  it('falls back to home when route is invalid', () => {
    expect(parseHashRoute('#/unknown')).toEqual({ view: 'home', playerContentId: null });
  });
});
