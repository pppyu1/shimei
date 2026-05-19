import type { StartupProfile } from '../../lib/startup';

export type StartupQualityMode = 'full' | 'reduced';

export interface StartupViewport {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface StartupStarParticle {
  id: string;
  left: string;
  top: string;
  sizePx: number;
  opacity: number;
  blurPx: number;
  depth: number;
  color: string;
  twinkleDurationMs: number;
  twinkleDelayMs: number;
  hueShiftDeg: number;
  driftXpx: number;
  driftYpx: number;
  scaleMin: number;
  scaleMax: number;
}

export interface StartupMeteorParticle {
  id: string;
  left: string;
  top: string;
  tailLengthPx: number;
  thicknessPx: number;
  durationMs: number;
  delayMs: number;
  travelXpx: number;
  travelYpx: number;
  opacity: number;
  blurPx: number;
  color: string;
  angleDeg: number;
}

export interface StartupAudioCue {
  id: string;
  type: 'meteor-pass' | 'star-cluster';
  atMs: number;
  intensity: number;
  pan: number;
  durationMs: number;
}

export interface StartupPerformanceSample {
  fps: number;
  frameTimeMs: number;
}

export interface StartupPerformanceReport {
  averageFps: number;
  minFps: number;
  sampleCount: number;
  droppedFrameRatio: number;
  targetFps: number;
  recommendedQuality: StartupQualityMode;
}

const REFERENCE_VIEWPORT_AREA = 390 * 844;
const STAR_PALETTE = ['#fff8ea', '#f7f2ff', '#dfe9ff', '#ffe6c2'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const getViewportScale = (viewport: StartupViewport) =>
  clamp(Math.sqrt((viewport.width * viewport.height) / REFERENCE_VIEWPORT_AREA), 0.72, 1.45);

const getQualityMultiplier = (mode: StartupQualityMode) => (mode === 'reduced' ? 0.56 : 1);

export const createStartupViewport = (
  width: number,
  height: number,
  pixelRatio: number,
  profile: StartupProfile,
): StartupViewport => ({
  width: Math.max(320, Math.round(width)),
  height: Math.max(568, Math.round(height)),
  pixelRatio: clamp(pixelRatio, 1, profile.performanceConfig.devicePixelRatioCap),
});

export const buildStarParticles = (
  profile: StartupProfile,
  viewport: StartupViewport,
  qualityMode: StartupQualityMode,
  seed = 17,
): StartupStarParticle[] => {
  const random = createSeededRandom(seed);
  const viewportScale = getViewportScale(viewport);
  const density = profile.starConfig.density * getQualityMultiplier(qualityMode);
  const count = Math.max(16, Math.round(profile.particleCount * density * viewportScale));

  return Array.from({ length: count }, (_, index) => {
    const depth = 1 + Math.floor(random() * profile.depthLayers);
    const depthRatio = depth / profile.depthLayers;
    const sizePx =
      lerp(profile.starConfig.minSizePx, profile.starConfig.maxSizePx, random()) *
      lerp(0.82, 1.24, depthRatio) *
      clamp(viewportScale, 0.8, 1.15);
    const twinkleDurationMs = Math.round(
      lerp(profile.starConfig.twinkleDurationRangeMs[0], profile.starConfig.twinkleDurationRangeMs[1], random()) *
        lerp(1.18, 0.86, depthRatio),
    );
    const twinkleDelayMs = Math.round(random() * twinkleDurationMs);
    const hueShiftDeg = lerp(profile.starConfig.hueShiftRangeDeg[0], profile.starConfig.hueShiftRangeDeg[1], random());
    const driftXpx = Number(lerp(-2.4, 2.4, random()).toFixed(2));
    const driftYpx = Number(lerp(-3.2, 1.8, random()).toFixed(2));
    const opacity = Number(lerp(0.22, 0.82, random() * depthRatio + depthRatio * 0.18).toFixed(3));
    const blurPx = Number(lerp(0.2, 1.8, depthRatio).toFixed(2));
    const left = `${(random() * 100).toFixed(2)}%`;
    const top = `${(random() * 78).toFixed(2)}%`;
    const color = STAR_PALETTE[Math.floor(random() * STAR_PALETTE.length)];

    return {
      id: `star-${index}`,
      left,
      top,
      sizePx: Number(sizePx.toFixed(2)),
      opacity,
      blurPx,
      depth,
      color,
      twinkleDurationMs,
      twinkleDelayMs,
      hueShiftDeg: Number(hueShiftDeg.toFixed(2)),
      driftXpx,
      driftYpx,
      scaleMin: Number(lerp(0.76, 0.96, 1 - depthRatio).toFixed(2)),
      scaleMax: Number(lerp(1.04, 1.34, depthRatio).toFixed(2)),
    };
  });
};

export const buildMeteorParticles = (
  profile: StartupProfile,
  viewport: StartupViewport,
  qualityMode: StartupQualityMode,
  seed = 101,
): StartupMeteorParticle[] => {
  const configuredCount = Math.min(profile.meteorCount, profile.meteorConfig.count);
  const count = qualityMode === 'reduced' ? Math.ceil(configuredCount / 2) : configuredCount;
  if (count <= 0) {
    return [];
  }

  const random = createSeededRandom(seed);
  const viewportScale = getViewportScale(viewport);

  return Array.from({ length: count }, (_, index) => {
    const left = `${lerp(62, 102, random()).toFixed(2)}%`;
    const top = `${lerp(4, 38, random()).toFixed(2)}%`;
    const speed = lerp(profile.meteorConfig.speedRangePxPerSecond[0], profile.meteorConfig.speedRangePxPerSecond[1], random());
    const travelXpx = -Math.round(lerp(viewport.width * 0.42, viewport.width * 0.88, random()));
    const travelYpx = Math.round(lerp(viewport.height * 0.12, viewport.height * 0.34, random()));
    const distance = Math.sqrt(travelXpx ** 2 + travelYpx ** 2);
    const durationMs = Math.round((distance / speed) * 1000);
    const tailLengthPx =
      lerp(profile.meteorConfig.tailLengthRangePx[0], profile.meteorConfig.tailLengthRangePx[1], random()) *
      viewportScale *
      lerp(0.92, 1.12, random());
    const thicknessPx = lerp(profile.meteorConfig.thicknessRangePx[0], profile.meteorConfig.thicknessRangePx[1], random());
    const delayMs = Math.round(lerp(profile.meteorConfig.spawnWindowMs[0], profile.meteorConfig.spawnWindowMs[1], random()));
    const opacity = Number(lerp(0.58, 0.96, random()).toFixed(3));
    const angleDeg = Number((Math.atan2(travelYpx, travelXpx) * (180 / Math.PI)).toFixed(2));

    return {
      id: `meteor-${index}`,
      left,
      top,
      tailLengthPx: Number(tailLengthPx.toFixed(2)),
      thicknessPx: Number(thicknessPx.toFixed(2)),
      durationMs,
      delayMs,
      travelXpx,
      travelYpx,
      opacity,
      blurPx: Number(lerp(1.8, 3.4, random()).toFixed(2)),
      color: random() > 0.55 ? '#fff1cc' : '#dfeaff',
      angleDeg,
    };
  });
};

export const buildStartupAudioCues = (
  profile: StartupProfile,
  meteors: StartupMeteorParticle[],
  stars: StartupStarParticle[],
): StartupAudioCue[] => {
  if (!profile.audioSync.enabled) {
    return [];
  }

  const meteorCues = meteors.map((meteor, index) => ({
    id: `audio-meteor-${index}`,
    type: 'meteor-pass' as const,
    atMs: Math.max(0, meteor.delayMs - profile.audioSync.cueLeadInMs),
    intensity: Number(clamp(meteor.opacity * 0.92, 0.2, 1).toFixed(2)),
    pan: Number(clamp((Number.parseFloat(meteor.left) - 50) / 50, -1, 1).toFixed(2)),
    durationMs: meteor.durationMs,
  }));

  const clusterSize = Math.max(4, Math.floor(stars.length / 12));
  const starCues = stars.slice(0, clusterSize).map((star, index) => ({
    id: `audio-star-${index}`,
    type: 'star-cluster' as const,
    atMs: Math.max(0, star.twinkleDelayMs - profile.audioSync.cueLeadInMs),
    intensity: Number(clamp(star.opacity * 0.7, 0.12, 0.68).toFixed(2)),
    pan: Number(clamp((Number.parseFloat(star.left) - 50) / 50, -1, 1).toFixed(2)),
    durationMs: Math.round(star.twinkleDurationMs * 0.35),
  }));

  return [...meteorCues, ...starCues].sort((left, right) => left.atMs - right.atMs);
};

export const summarizePerformanceSamples = (
  samples: StartupPerformanceSample[],
  targetFps: number,
): StartupPerformanceReport => {
  if (!samples.length) {
    return {
      averageFps: targetFps,
      minFps: targetFps,
      sampleCount: 0,
      droppedFrameRatio: 0,
      targetFps,
      recommendedQuality: 'full',
    };
  }

  const fpsValues = samples.map((sample) => sample.fps);
  const averageFps = fpsValues.reduce((total, fps) => total + fps, 0) / fpsValues.length;
  const minFps = Math.min(...fpsValues);
  const droppedFrameRatio = fpsValues.filter((fps) => fps < targetFps * 0.92).length / fpsValues.length;
  const recommendedQuality: StartupQualityMode = averageFps < targetFps * 0.82 || minFps < targetFps * 0.72 ? 'reduced' : 'full';

  return {
    averageFps: Number(averageFps.toFixed(2)),
    minFps: Number(minFps.toFixed(2)),
    sampleCount: samples.length,
    droppedFrameRatio: Number(droppedFrameRatio.toFixed(2)),
    targetFps,
    recommendedQuality,
  };
};
