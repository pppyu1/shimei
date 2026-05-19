import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendPreferenceHistory, applyPreferencesToDocument, defaultPreferences, loadPreferenceHistory, loadPreferences, savePreferences } from './preferences';

describe('preferences storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-density');
    document.documentElement.classList.remove('reduce-motion');
  });

  it('loads defaults when storage is empty', () => {
    expect(loadPreferences()).toEqual(defaultPreferences);
  });

  it('saves and reloads preferences', () => {
    const next = {
      ...defaultPreferences,
      theme: 'dawn' as const,
      reduceMotion: true,
      compactMode: true,
    };

    expect(savePreferences(next).ok).toBe(true);
    expect(loadPreferences()).toEqual(next);
  });

  it('records preference history entries', () => {
    const result = appendPreferenceHistory('主题模式', '晨曦');
    expect(result.ok).toBe(true);
    expect(loadPreferenceHistory()).toHaveLength(1);
    expect(loadPreferenceHistory()[0]).toMatchObject({ label: '主题模式', value: '晨曦' });
  });

  it('applies preferences to document dataset', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    applyPreferencesToDocument({
      ...defaultPreferences,
      theme: 'system',
      compactMode: true,
      reduceMotion: true,
    });

    expect(document.documentElement.dataset.theme).toBe('dawn');
    expect(document.documentElement.dataset.density).toBe('compact');
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
  });
});
