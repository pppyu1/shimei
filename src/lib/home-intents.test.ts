import { beforeEach, describe, expect, it } from 'vitest';
import type { HomeIntentState } from './home-intents';
import { defaultHomeIntentState, loadHomeIntentState, saveHomeIntentState, updateHomeIntentState } from './home-intents';

describe('home intent storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads default state when storage is empty', () => {
    expect(loadHomeIntentState()).toEqual(defaultHomeIntentState);
  });

  it('saves and reloads intent state', () => {
    const next: HomeIntentState = {
      selectedIntent: 'sleep' as const,
      history: ['sleep', 'relax'],
    };

    expect(saveHomeIntentState(next).ok).toBe(true);
    expect(loadHomeIntentState()).toEqual(next);
  });

  it('updates selected intent and prepends history uniquely', () => {
    const next = updateHomeIntentState(
      {
        selectedIntent: 'relax',
        history: ['focus', 'sleep'],
      },
      'sleep',
    );

    expect(next.selectedIntent).toBe('sleep');
    expect(next.history).toEqual(['sleep', 'focus']);
  });
});
