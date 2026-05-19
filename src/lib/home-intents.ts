export type HomeIntentId = 'relax' | 'anxiety' | 'sleep' | 'focus';

export interface HomeIntentState {
  selectedIntent: HomeIntentId;
  history: HomeIntentId[];
}

const homeIntentStorageKey = 'shimei:home-intent';
const maxHistoryEntries = 6;

export const defaultHomeIntentState: HomeIntentState = {
  selectedIntent: 'relax',
  history: [],
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isIntentId = (value: unknown): value is HomeIntentId =>
  value === 'relax' || value === 'anxiety' || value === 'sleep' || value === 'focus';

export const loadHomeIntentState = (): HomeIntentState => {
  if (!canUseStorage()) {
    return defaultHomeIntentState;
  }

  try {
    const raw = window.localStorage.getItem(homeIntentStorageKey);
    if (!raw) {
      return defaultHomeIntentState;
    }

    const parsed = JSON.parse(raw) as Partial<HomeIntentState>;
    const selectedIntent = isIntentId(parsed.selectedIntent) ? parsed.selectedIntent : defaultHomeIntentState.selectedIntent;
    const history = Array.isArray(parsed.history) ? parsed.history.filter(isIntentId).slice(0, maxHistoryEntries) : [];
    return { selectedIntent, history };
  } catch {
    return defaultHomeIntentState;
  }
};

export const saveHomeIntentState = (state: HomeIntentState) => {
  if (!canUseStorage()) {
    return { ok: true as const };
  }

  try {
    window.localStorage.setItem(homeIntentStorageKey, JSON.stringify(state));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : '此刻意图保存失败';
    return { ok: false as const, error: message };
  }
};

export const updateHomeIntentState = (current: HomeIntentState, nextIntent: HomeIntentId): HomeIntentState => ({
  selectedIntent: nextIntent,
  history: [nextIntent, ...current.history.filter((item) => item !== nextIntent)].slice(0, maxHistoryEntries),
});
