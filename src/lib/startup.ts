import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type StartupPhase = 'visible' | 'fading' | 'done';

export interface StartupStarConfig {
  density: number;
  minSizePx: number;
  maxSizePx: number;
  twinkleDurationRangeMs: [number, number];
  hueShiftRangeDeg: [number, number];
}

export interface StartupMeteorConfig {
  count: number;
  speedRangePxPerSecond: [number, number];
  tailLengthRangePx: [number, number];
  thicknessRangePx: [number, number];
  spawnWindowMs: [number, number];
}

export interface StartupPerformanceConfig {
  targetFps: number;
  sampleSize: number;
  degradeBelowFps: number;
  devicePixelRatioCap: number;
}

export interface StartupAudioSyncConfig {
  enabled: boolean;
  cueLeadInMs: number;
}

export interface StartupProfile {
  lowPowerMode: boolean;
  minDurationMs: number;
  maxDurationMs: number;
  fadeDurationMs: number;
  particleCount: number;
  meteorCount: number;
  starConfig: StartupStarConfig;
  meteorConfig: StartupMeteorConfig;
  performanceConfig: StartupPerformanceConfig;
  audioSync: StartupAudioSyncConfig;
  depthLayers: number;
  bloomEnabled: boolean;
  grainEnabled: boolean;
}

const defaultProfile: StartupProfile = {
  lowPowerMode: false,
  minDurationMs: 2400,
  maxDurationMs: 3600,
  fadeDurationMs: 240,
  particleCount: 72,
  meteorCount: 2,
  starConfig: {
    density: 1,
    minSizePx: 1.2,
    maxSizePx: 4.8,
    twinkleDurationRangeMs: [2200, 5200],
    hueShiftRangeDeg: [-18, 24],
  },
  meteorConfig: {
    count: 4,
    speedRangePxPerSecond: [760, 1260],
    tailLengthRangePx: [72, 168],
    thicknessRangePx: [1.2, 2.8],
    spawnWindowMs: [1100, 6800],
  },
  performanceConfig: {
    targetFps: 60,
    sampleSize: 24,
    degradeBelowFps: 46,
    devicePixelRatioCap: 1.8,
  },
  audioSync: {
    enabled: true,
    cueLeadInMs: 140,
  },
  depthLayers: 3,
  bloomEnabled: true,
  grainEnabled: true,
};

export const detectStartupProfile = (): StartupProfile => {
  if (typeof window === 'undefined') {
    return defaultProfile;
  }

  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const lowConcurrency = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
  const lowPowerMode = reducedMotion || saveData || lowConcurrency;

  return {
    lowPowerMode,
    minDurationMs: lowPowerMode ? 2000 : defaultProfile.minDurationMs,
    maxDurationMs: lowPowerMode ? 2800 : defaultProfile.maxDurationMs,
    fadeDurationMs: lowPowerMode ? 160 : defaultProfile.fadeDurationMs,
    particleCount: lowPowerMode ? 36 : defaultProfile.particleCount,
    meteorCount: lowPowerMode ? 0 : defaultProfile.meteorCount,
    starConfig: {
      ...defaultProfile.starConfig,
      density: lowPowerMode ? 0.58 : defaultProfile.starConfig.density,
      maxSizePx: lowPowerMode ? 3.6 : defaultProfile.starConfig.maxSizePx,
      twinkleDurationRangeMs: lowPowerMode ? [2800, 6200] : defaultProfile.starConfig.twinkleDurationRangeMs,
      hueShiftRangeDeg: lowPowerMode ? [-8, 12] : defaultProfile.starConfig.hueShiftRangeDeg,
    },
    meteorConfig: {
      ...defaultProfile.meteorConfig,
      count: lowPowerMode ? 0 : defaultProfile.meteorConfig.count,
      speedRangePxPerSecond: lowPowerMode ? [680, 980] : defaultProfile.meteorConfig.speedRangePxPerSecond,
      tailLengthRangePx: lowPowerMode ? [56, 112] : defaultProfile.meteorConfig.tailLengthRangePx,
      thicknessRangePx: lowPowerMode ? [1, 2] : defaultProfile.meteorConfig.thicknessRangePx,
      spawnWindowMs: lowPowerMode ? [1800, 7200] : defaultProfile.meteorConfig.spawnWindowMs,
    },
    performanceConfig: {
      ...defaultProfile.performanceConfig,
      sampleSize: lowPowerMode ? 18 : defaultProfile.performanceConfig.sampleSize,
      degradeBelowFps: lowPowerMode ? 42 : defaultProfile.performanceConfig.degradeBelowFps,
      devicePixelRatioCap: lowPowerMode ? 1.2 : defaultProfile.performanceConfig.devicePixelRatioCap,
    },
    audioSync: {
      enabled: !lowPowerMode,
      cueLeadInMs: lowPowerMode ? 80 : defaultProfile.audioSync.cueLeadInMs,
    },
    depthLayers: lowPowerMode ? 2 : defaultProfile.depthLayers,
    bloomEnabled: !lowPowerMode,
    grainEnabled: !lowPowerMode,
  };
};

export const preloadStartupAssets = async (assetUrls: string[], onProgress?: (progress: number) => void) => {
  const uniqueUrls = [...new Set(assetUrls.filter(Boolean))];
  if (!uniqueUrls.length) {
    onProgress?.(100);
    return;
  }

  let loaded = 0;
  const notify = () => {
    loaded += 1;
    onProgress?.(Math.round((loaded / uniqueUrls.length) * 100));
  };

  await Promise.all(
    uniqueUrls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => {
            notify();
            resolve();
          };
          img.onerror = () => {
            notify();
            resolve();
          };
          img.src = url;
        }),
    ),
  );
};

export const useStartupSequence = (assetUrls: string[]) => {
  const profile = useMemo(() => detectStartupProfile(), []);
  const normalizedAssetUrls = useMemo(() => [...new Set(assetUrls.filter(Boolean))], [assetUrls]);
  const assetUrlsKey = useMemo(() => JSON.stringify(normalizedAssetUrls), [normalizedAssetUrls]);
  const [phase, setPhase] = useState<StartupPhase>('visible');
  const [progress, setProgress] = useState(8);
  const fadeTimeoutRef = useRef<number | null>(null);
  const finishScheduleTimeoutRef = useRef<number | null>(null);
  const hardStopTimeoutRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback((mode: 'fade' | 'instant' = 'fade') => {
    if (doneRef.current) return;
    doneRef.current = true;

    if (finishScheduleTimeoutRef.current) {
      window.clearTimeout(finishScheduleTimeoutRef.current);
      finishScheduleTimeoutRef.current = null;
    }
    if (hardStopTimeoutRef.current) {
      window.clearTimeout(hardStopTimeoutRef.current);
      hardStopTimeoutRef.current = null;
    }
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    setProgress(100);

    if (mode === 'instant') {
      setPhase('done');
      return;
    }

    setPhase('fading');
    fadeTimeoutRef.current = window.setTimeout(() => {
      setPhase('done');
    }, profile.fadeDurationMs);
  }, [profile.fadeDurationMs]);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    hardStopTimeoutRef.current = window.setTimeout(() => {
      if (!cancelled) {
        finish('fade');
      }
    }, profile.maxDurationMs);

    const run = async () => {
      const resolvedAssetUrls = JSON.parse(assetUrlsKey) as string[];
      await preloadStartupAssets(resolvedAssetUrls, (value) => {
        if (!cancelled && !doneRef.current) {
          setProgress(Math.max(8, Math.min(100, value)));
        }
      });

      const remaining = Math.max(0, profile.minDurationMs - (Date.now() - startedAt));
      finishScheduleTimeoutRef.current = window.setTimeout(() => {
        if (!cancelled) {
          finish('fade');
        }
      }, remaining);
    };

    void run();

    return () => {
      cancelled = true;
      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (finishScheduleTimeoutRef.current) {
        window.clearTimeout(finishScheduleTimeoutRef.current);
        finishScheduleTimeoutRef.current = null;
      }
      if (hardStopTimeoutRef.current) {
        window.clearTimeout(hardStopTimeoutRef.current);
        hardStopTimeoutRef.current = null;
      }
    };
  }, [assetUrlsKey, finish, profile.maxDurationMs, profile.minDurationMs]);

  const skip = useCallback(() => {
    finish('fade');
  }, [finish]);

  return {
    phase,
    progress,
    profile,
    skip,
  };
};
