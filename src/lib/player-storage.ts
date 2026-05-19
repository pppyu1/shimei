import type { PlaybackSnapshot, PlayerContent } from '../features/shared/types';

const playerStateKey = 'shimei:last-player-state';
const offlineContentKey = 'shimei:offline-content-ids';
const offlineAudioCache = 'shimei-offline-audio-v1';

export interface StoredPlayerState {
  contentId: string | null;
  snapshot: PlaybackSnapshot;
}

const emptySnapshot: PlaybackSnapshot = {
  currentTime: 0,
  duration: 0,
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readOfflineIds = () => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(offlineContentKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

const writeOfflineIds = (contentIds: string[]) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(offlineContentKey, JSON.stringify(Array.from(new Set(contentIds))));
};

export const isOfflineReady = (contentId: string) => readOfflineIds().includes(contentId);

export const savePlayerState = (contentId: string, snapshot: PlaybackSnapshot) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    playerStateKey,
    JSON.stringify({
      contentId,
      snapshot,
    } satisfies StoredPlayerState),
  );
};

export const loadPlayerState = (): StoredPlayerState => {
  if (!canUseStorage()) {
    return {
      contentId: null,
      snapshot: emptySnapshot,
    };
  }

  try {
    const raw = window.localStorage.getItem(playerStateKey);
    if (!raw) {
      return {
        contentId: null,
        snapshot: emptySnapshot,
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredPlayerState>;
    return {
      contentId: typeof parsed.contentId === 'string' ? parsed.contentId : null,
      snapshot:
        typeof parsed.snapshot?.currentTime === 'number' && typeof parsed.snapshot?.duration === 'number'
          ? parsed.snapshot
          : emptySnapshot,
    };
  } catch {
    return {
      contentId: null,
      snapshot: emptySnapshot,
    };
  }
};

const canUseCacheStorage = () => typeof window !== 'undefined' && 'caches' in window;

export const cacheAudioForOffline = async (content: PlayerContent) => {
  if (!canUseCacheStorage()) {
    throw new Error('当前环境不支持离线缓存');
  }

  const cache = await window.caches.open(offlineAudioCache);
  const response = await fetch(content.audioUrl);
  if (!response.ok && response.type !== 'opaque') {
    throw new Error('音频下载失败');
  }

  await cache.put(content.audioUrl, response.clone());
  writeOfflineIds([...readOfflineIds(), content.id]);
};

export const resolvePlayableAudioUrl = async (content: PlayerContent) => {
  if (!canUseCacheStorage()) {
    return {
      url: content.audioUrl,
      fromCache: false,
    };
  }

  const cache = await window.caches.open(offlineAudioCache);
  const match = await cache.match(content.audioUrl);
  if (!match) {
    return {
      url: content.audioUrl,
      fromCache: false,
    };
  }

  const blob = await match.blob();
  return {
    url: URL.createObjectURL(blob),
    fromCache: true,
  };
};

export const revokePlayableAudioUrl = (url: string) => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};
