import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { StartupPhase, StartupProfile } from '../../lib/startup';
import {
  buildMeteorParticles,
  buildStarParticles,
  buildStartupAudioCues,
  createStartupViewport,
  summarizePerformanceSamples,
  type StartupAudioCue,
  type StartupPerformanceReport,
  type StartupPerformanceSample,
  type StartupQualityMode,
} from './startup-effects';

export interface StartupSplashProps {
  phase: StartupPhase;
  progress: number;
  profile: StartupProfile;
  onSkip: () => void;
  onAudioCuePlan?: (cues: StartupAudioCue[]) => void;
  onPerformanceReport?: (report: StartupPerformanceReport) => void;
}

export const StartupSplash = ({
  phase,
  progress,
  profile,
  onSkip,
  onAudioCuePlan,
  onPerformanceReport,
}: StartupSplashProps) => {
  const visible = phase !== 'done';
  const pointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const performanceReportedRef = React.useRef(false);
  const [qualityMode, setQualityMode] = React.useState<StartupQualityMode>(profile.lowPowerMode ? 'reduced' : 'full');
  const [viewport, setViewport] = React.useState(() =>
    createStartupViewport(
      typeof window === 'undefined' ? 390 : window.innerWidth,
      typeof window === 'undefined' ? 844 : window.innerHeight,
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      profile,
    ),
  );

  React.useEffect(() => {
    setQualityMode(profile.lowPowerMode ? 'reduced' : 'full');
  }, [profile.lowPowerMode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let frameId = 0;
    const updateViewport = () => {
      setViewport(createStartupViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1, profile));
    };
    const onResize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateViewport);
    };

    updateViewport();
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
    };
  }, [profile]);

  const stars = React.useMemo(() => buildStarParticles(profile, viewport, qualityMode), [profile, qualityMode, viewport]);
  const meteors = React.useMemo(() => buildMeteorParticles(profile, viewport, qualityMode), [profile, qualityMode, viewport]);
  const nearStars = React.useMemo(() => stars.filter((star) => star.depth >= profile.depthLayers), [profile.depthLayers, stars]);
  const midStars = React.useMemo(
    () => stars.filter((star) => star.depth > 1 && star.depth < profile.depthLayers),
    [profile.depthLayers, stars],
  );
  const farStars = React.useMemo(() => stars.filter((star) => star.depth === 1), [stars]);
  const audioCuePlan = React.useMemo(() => buildStartupAudioCues(profile, meteors, stars), [meteors, profile, stars]);

  React.useEffect(() => {
    onAudioCuePlan?.(audioCuePlan);
  }, [audioCuePlan, onAudioCuePlan]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !visible || performanceReportedRef.current) {
      return;
    }

    let animationFrameId = 0;
    let previousTime = 0;
    const samples: StartupPerformanceSample[] = [];

    const measure = (time: number) => {
      if (previousTime > 0) {
        const frameTimeMs = time - previousTime;
        const fps = 1000 / Math.max(1, frameTimeMs);
        samples.push({ fps, frameTimeMs });
      }
      previousTime = time;

      if (samples.length >= profile.performanceConfig.sampleSize) {
        const report = summarizePerformanceSamples(samples, profile.performanceConfig.targetFps);
        performanceReportedRef.current = true;
        onPerformanceReport?.(report);
        if (report.averageFps < profile.performanceConfig.degradeBelowFps || report.recommendedQuality === 'reduced') {
          setQualityMode('reduced');
        }
        return;
      }

      animationFrameId = window.requestAnimationFrame(measure);
    };

    animationFrameId = window.requestAnimationFrame(measure);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [
    onPerformanceReport,
    profile.performanceConfig.degradeBelowFps,
    profile.performanceConfig.sampleSize,
    profile.performanceConfig.targetFps,
    visible,
  ]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start) return;
    const deltaX = Math.abs(event.clientX - start.x);
    const deltaY = event.clientY - start.y;
    pointerStartRef.current = null;

    if (deltaY <= -30 || (Math.abs(deltaY) < 10 && deltaX < 10)) {
      onSkip();
    }
  };

  const handleSkipPress = (event: React.SyntheticEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    pointerStartRef.current = null;
    onSkip();
  };

  const handleSkipClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) {
      return;
    }
    handleSkipPress(event);
  };

  return (
    <div
      className={`fixed inset-0 z-[120] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} ${
        visible ? 'pointer-events-auto' : 'pointer-events-none'
      } ${
        phase === 'fading' ? 'opacity-0' : ''
      }`}
      aria-hidden={!visible}
      data-testid="startup-splash"
      data-quality-mode={qualityMode}
      data-progress={progress}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="absolute inset-0 startup-sky-backdrop" />
      <div className="absolute inset-0 startup-depth-vignette" />
      <div className="absolute inset-0 startup-nebula-layer startup-nebula-layer-a" />
      <div className="absolute inset-0 startup-nebula-layer startup-nebula-layer-b" />
      <div className="absolute inset-0 overflow-hidden startup-starfield-far" data-testid="startup-stars-far">
        {farStars.map((star) => (
          <span
            key={star.id}
            className="absolute startup-star-particle startup-star-particle-far rounded-full"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.sizePx}px`,
              height: `${star.sizePx}px`,
              background: star.color,
              filter: `blur(${star.blurPx}px)`,
              animationDelay: `${star.twinkleDelayMs}ms`,
              animationDuration: `${star.twinkleDurationMs}ms`,
              ['--star-opacity' as const]: String(star.opacity),
              ['--star-scale-min' as const]: String(star.scaleMin),
              ['--star-scale-max' as const]: String(star.scaleMax),
              ['--star-hue-shift' as const]: `${star.hueShiftDeg}deg`,
              ['--star-drift-x' as const]: `${star.driftXpx}px`,
              ['--star-drift-y' as const]: `${star.driftYpx}px`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 overflow-hidden startup-starfield-mid" data-testid="startup-stars-mid">
        {midStars.map((star) => (
          <span
            key={star.id}
            className="absolute startup-star-particle rounded-full"
            style={{
              width: `${star.sizePx}px`,
              height: `${star.sizePx}px`,
              left: star.left,
              top: star.top,
              background: star.color,
              filter: `blur(${star.blurPx}px)`,
              animationDelay: `${star.twinkleDelayMs}ms`,
              animationDuration: `${star.twinkleDurationMs}ms`,
              ['--star-opacity' as const]: String(star.opacity),
              ['--star-scale-min' as const]: String(star.scaleMin),
              ['--star-scale-max' as const]: String(star.scaleMax),
              ['--star-hue-shift' as const]: `${star.hueShiftDeg}deg`,
              ['--star-drift-x' as const]: `${star.driftXpx}px`,
              ['--star-drift-y' as const]: `${star.driftYpx}px`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 overflow-hidden startup-starfield-near" data-testid="startup-stars-near">
        {nearStars.map((star) => (
          <span
            key={star.id}
            className="absolute startup-star-particle startup-star-particle-near rounded-full"
            style={{
              width: `${star.sizePx}px`,
              height: `${star.sizePx}px`,
              left: star.left,
              top: star.top,
              background: star.color,
              filter: `blur(${star.blurPx}px)`,
              animationDelay: `${star.twinkleDelayMs}ms`,
              animationDuration: `${star.twinkleDurationMs}ms`,
              ['--star-opacity' as const]: String(star.opacity),
              ['--star-scale-min' as const]: String(star.scaleMin),
              ['--star-scale-max' as const]: String(star.scaleMax),
              ['--star-hue-shift' as const]: `${star.hueShiftDeg}deg`,
              ['--star-drift-x' as const]: `${star.driftXpx}px`,
              ['--star-drift-y' as const]: `${star.driftYpx}px`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 overflow-hidden" data-testid="startup-meteors">
        {meteors.map((meteor) => (
          <span
            key={meteor.id}
            className="absolute startup-meteor"
            style={{
              left: meteor.left,
              top: meteor.top,
              width: `${meteor.tailLengthPx}px`,
              height: `${meteor.thicknessPx}px`,
              filter: `blur(${meteor.blurPx}px)`,
              background: `linear-gradient(90deg, rgba(255,255,255,0), ${meteor.color})`,
              animationDelay: `${meteor.delayMs}ms`,
              animationDuration: `${meteor.durationMs}ms`,
              ['--meteor-opacity' as const]: String(meteor.opacity),
              ['--meteor-travel-x' as const]: `${meteor.travelXpx}px`,
              ['--meteor-travel-y' as const]: `${meteor.travelYpx}px`,
              ['--meteor-angle' as const]: `${meteor.angleDeg}deg`,
            }}
          />
        ))}
      </div>
      <div className={`absolute top-5 right-5 sm:top-6 sm:right-6 z-20 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            pointerStartRef.current = null;
          }}
          onPointerUp={handleSkipPress}
          onClick={handleSkipClick}
          style={{ touchAction: 'manipulation' }}
          className="min-h-11 px-4 rounded-full border border-primary/15 bg-surface/70 backdrop-blur-xl text-sm text-on-surface hover:bg-surface-container-high transition-colors inline-flex items-center gap-2"
        >
          跳过
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        className="relative z-0 h-full px-5"
        style={{
          paddingLeft: 'max(env(safe-area-inset-left), 44px)',
          paddingRight: 'max(env(safe-area-inset-right), 44px)',
          paddingTop: 'max(env(safe-area-inset-top), 30px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 30px)',
        }}
      >
        <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-xl text-center" style={{ top: '61.8%' }}>
          <div className="-translate-y-1/2 space-y-6">
            <div className="mx-auto relative w-40 h-40 sm:w-52 sm:h-52 startup-brand-mark">
              {profile.bloomEnabled && <div className="absolute inset-[-10%] rounded-full moon-bloom" />}
              <div className="absolute inset-0 rounded-full moon-glow" />
              <div className="absolute inset-[18%] moon-surface rounded-full overflow-hidden shadow-[0_0_24px_rgba(243,221,176,0.24)]">
                <div className="absolute inset-0 moon-grain" style={{ opacity: profile.grainEnabled ? 1 : 0.2 }} />
                <div className="absolute inset-0 moon-phase-shadow" />
                <div className="absolute inset-0 moon-phase-mask" />
                <div className="absolute inset-[16%] rounded-full border border-white/12" />
                <div className="absolute inset-[24%] moon-crater-ring rounded-full opacity-40" />
                <div className="absolute left-[22%] top-[28%] w-6 h-6 rounded-full bg-[#d5bc8a]/35 blur-[1px]" />
                <div className="absolute right-[24%] top-[36%] w-4 h-4 rounded-full bg-[#f6e6bd]/20 blur-[1px]" />
                <div className="absolute left-[46%] bottom-[22%] w-8 h-8 rounded-full bg-[#c9af7c]/20 blur-[1px]" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-label uppercase tracking-[0.35em] text-primary/80">Moon Cycle Prelude</p>
              <h1 className="font-headline text-4xl sm:text-6xl text-on-surface">Shi Mei</h1>
              <p className="max-w-md mx-auto text-sm sm:text-base text-on-surface-variant leading-7">
                借月光一程，伴你一夜好眠
              </p>
              <p className="max-w-xs mx-auto text-[11px] sm:text-xs text-on-surface-variant/75 leading-5">
                星轨已校准 {Math.max(8, progress)}%，流星与星闪会在同一节奏内缓慢展开。
              </p>
              {profile.lowPowerMode && <p className="max-w-sm mx-auto text-xs text-on-surface-variant/80 leading-6">已启用低负载模式，优先保证低端设备上的平滑体验。</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
