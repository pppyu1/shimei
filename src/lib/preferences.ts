export type AppTheme = 'obsidian' | 'dawn' | 'system';

export interface AppPreferences {
  theme: AppTheme;
  reduceMotion: boolean;
  compactMode: boolean;
  notifications: {
    bedtimeReminder: boolean;
    weeklyDigest: boolean;
    productUpdates: boolean;
    emailAlerts: boolean;
  };
  security: {
    rememberSession: boolean;
    biometricLock: boolean;
    confirmSensitiveActions: boolean;
  };
}

export interface PreferenceHistoryEntry {
  id: string;
  label: string;
  value: string;
  at: string;
}

const preferencesStorageKey = 'shimei:app-preferences';
const preferencesHistoryStorageKey = 'shimei:app-preferences-history';
const maxHistoryEntries = 8;

export const defaultPreferences: AppPreferences = {
  theme: 'obsidian',
  reduceMotion: false,
  compactMode: false,
  notifications: {
    bedtimeReminder: true,
    weeklyDigest: true,
    productUpdates: false,
    emailAlerts: true,
  },
  security: {
    rememberSession: true,
    biometricLock: false,
    confirmSensitiveActions: true,
  },
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizePreferences = (raw?: Partial<AppPreferences> | null): AppPreferences => ({
  theme: raw?.theme === 'dawn' || raw?.theme === 'system' ? raw.theme : defaultPreferences.theme,
  reduceMotion: typeof raw?.reduceMotion === 'boolean' ? raw.reduceMotion : defaultPreferences.reduceMotion,
  compactMode: typeof raw?.compactMode === 'boolean' ? raw.compactMode : defaultPreferences.compactMode,
  notifications: {
    bedtimeReminder:
      typeof raw?.notifications?.bedtimeReminder === 'boolean'
        ? raw.notifications.bedtimeReminder
        : defaultPreferences.notifications.bedtimeReminder,
    weeklyDigest:
      typeof raw?.notifications?.weeklyDigest === 'boolean'
        ? raw.notifications.weeklyDigest
        : defaultPreferences.notifications.weeklyDigest,
    productUpdates:
      typeof raw?.notifications?.productUpdates === 'boolean'
        ? raw.notifications.productUpdates
        : defaultPreferences.notifications.productUpdates,
    emailAlerts:
      typeof raw?.notifications?.emailAlerts === 'boolean'
        ? raw.notifications.emailAlerts
        : defaultPreferences.notifications.emailAlerts,
  },
  security: {
    rememberSession:
      typeof raw?.security?.rememberSession === 'boolean'
        ? raw.security.rememberSession
        : defaultPreferences.security.rememberSession,
    biometricLock:
      typeof raw?.security?.biometricLock === 'boolean'
        ? raw.security.biometricLock
        : defaultPreferences.security.biometricLock,
    confirmSensitiveActions:
      typeof raw?.security?.confirmSensitiveActions === 'boolean'
        ? raw.security.confirmSensitiveActions
        : defaultPreferences.security.confirmSensitiveActions,
  },
});

export const loadPreferences = () => {
  if (!canUseStorage()) {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(preferencesStorageKey);
    return normalizePreferences(raw ? (JSON.parse(raw) as Partial<AppPreferences>) : null);
  } catch {
    return defaultPreferences;
  }
};

export const savePreferences = (preferences: AppPreferences) => {
  if (!canUseStorage()) {
    return { ok: true as const };
  }

  try {
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : '偏好设置保存失败';
    return { ok: false as const, error: message };
  }
};

export const loadPreferenceHistory = () => {
  if (!canUseStorage()) {
    return [] as PreferenceHistoryEntry[];
  }

  try {
    const raw = window.localStorage.getItem(preferencesHistoryStorageKey);
    const parsed = raw ? (JSON.parse(raw) as PreferenceHistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry?.id === 'string') : [];
  } catch {
    return [] as PreferenceHistoryEntry[];
  }
};

export const appendPreferenceHistory = (label: string, value: string) => {
  const nextEntry: PreferenceHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    value,
    at: new Date().toISOString(),
  };

  const history = [nextEntry, ...loadPreferenceHistory()].slice(0, maxHistoryEntries);
  if (!canUseStorage()) {
    return { ok: true as const, history };
  }

  try {
    window.localStorage.setItem(preferencesHistoryStorageKey, JSON.stringify(history));
    return { ok: true as const, history };
  } catch (error) {
    const message = error instanceof Error ? error.message : '偏好历史记录保存失败';
    return { ok: false as const, error: message, history };
  }
};

const resolveTheme = (theme: AppTheme) => {
  if (theme !== 'system') {
    return theme;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'obsidian';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'obsidian' : 'dawn';
};

export const applyPreferencesToDocument = (preferences: AppPreferences) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = resolveTheme(preferences.theme);
  root.dataset.density = preferences.compactMode ? 'compact' : 'comfortable';
  root.classList.toggle('reduce-motion', preferences.reduceMotion);
};
