import { describe, expect, it } from 'vitest';
import type { StartupProfile } from '../../lib/startup';
import {
  buildMeteorParticles,
  buildStarParticles,
  buildStartupAudioCues,
  createStartupViewport,
  summarizePerformanceSamples,
} from './startup-effects';

const profile: StartupProfile = {
  lowPowerMode: false,
  minDurationMs: 2400,
  maxDurationMs: 3600,
  fadeDurationMs: 240,
  particleCount: 72,
  meteorCount: 3,
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

describe('startup effects', () => {
  it('builds deterministic stars and adapts to reduced quality', () => {
    const viewport = createStartupViewport(390, 844, 3, profile);
    const fullStars = buildStarParticles(profile, viewport, 'full', 99);
    const reducedStars = buildStarParticles(profile, viewport, 'reduced', 99);

    expect(fullStars.length).toBeGreaterThan(reducedStars.length);
    expect(fullStars[0]).toMatchObject({
      id: 'star-0',
      left: expect.stringMatching(/%/),
      top: expect.stringMatching(/%/),
    });
    expect(viewport.pixelRatio).toBeLessThanOrEqual(profile.performanceConfig.devicePixelRatioCap);
  });

  it('builds meteors and audio cues from the same schedule', () => {
    const viewport = createStartupViewport(430, 932, 2, profile);
    const stars = buildStarParticles(profile, viewport, 'full', 21);
    const meteors = buildMeteorParticles(profile, viewport, 'full', 21);
    const cues = buildStartupAudioCues(profile, meteors, stars);

    expect(meteors).toHaveLength(3);
    expect(cues.some((cue) => cue.type === 'meteor-pass')).toBe(true);
    expect(cues.some((cue) => cue.type === 'star-cluster')).toBe(true);
    expect(cues[0].atMs).toBeLessThanOrEqual(cues.at(-1)?.atMs ?? 0);
  });

  it('summarizes performance samples into a report', () => {
    const report = summarizePerformanceSamples(
      [
        { fps: 58, frameTimeMs: 17.2 },
        { fps: 55, frameTimeMs: 18.1 },
        { fps: 41, frameTimeMs: 24.3 },
        { fps: 39, frameTimeMs: 25.6 },
      ],
      60,
    );

    expect(report.sampleCount).toBe(4);
    expect(report.averageFps).toBeLessThan(60);
    expect(report.recommendedQuality).toBe('reduced');
    expect(report.droppedFrameRatio).toBeGreaterThan(0);
  });
});
