import { act, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StartupSplash } from './StartupSplash';
import type { StartupProfile } from '../../lib/startup';

const createProfile = (overrides: Partial<StartupProfile> = {}): StartupProfile => ({
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
    sampleSize: 6,
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
  ...overrides,
});

describe('StartupSplash', () => {
  it('renders brand copy and loading progress', () => {
    render(
      <StartupSplash
        phase="visible"
        progress={68}
        profile={createProfile()}
        onSkip={() => {}}
      />,
    );

    expect(screen.getByText('Shi Mei')).toBeInTheDocument();
    expect(screen.getByText('Moon Cycle Prelude')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '跳过' })).toBeInTheDocument();
    expect(screen.getByText(/星轨已校准 68%/)).toBeInTheDocument();
  });

  it('calls skip when skip button is pressed', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(
      <StartupSplash
        phase="visible"
        progress={40}
        profile={createProfile({
          lowPowerMode: true,
          minDurationMs: 2000,
          fadeDurationMs: 160,
          particleCount: 36,
          meteorCount: 0,
          bloomEnabled: false,
          grainEnabled: false,
          meteorConfig: {
            count: 0,
            speedRangePxPerSecond: [680, 980],
            tailLengthRangePx: [56, 112],
            thicknessRangePx: [1, 2],
            spawnWindowMs: [1800, 7200],
          },
          audioSync: {
            enabled: false,
            cueLeadInMs: 80,
          },
        })}
        onSkip={onSkip}
      />,
    );

    await user.click(screen.getByRole('button', { name: '跳过' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls skip on pointer interaction with the skip button', () => {
    const onSkip = vi.fn();
    render(<StartupSplash phase="visible" progress={40} profile={createProfile()} onSkip={onSkip} />);

    const button = screen.getByRole('button', { name: '跳过' });
    fireEvent.pointerDown(button, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(button, { clientX: 10, clientY: 10 });

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('keeps skip button interactive while the splash is fading', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();

    render(<StartupSplash phase="fading" progress={100} profile={createProfile()} onSkip={onSkip} />);

    await user.click(screen.getByRole('button', { name: '跳过' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('disables the skip hit area after the splash is done', () => {
    render(<StartupSplash phase="done" progress={100} profile={createProfile()} onSkip={() => {}} />);

    const skipButton = screen.getByRole('button', { name: '跳过', hidden: true });
    expect(skipButton.parentElement).toHaveClass('pointer-events-none');
  });

  it('supports swipe-up interruption on the splash surface', () => {
    const onSkip = vi.fn();
    const { container } = render(
      <StartupSplash
        phase="visible"
        progress={40}
        profile={createProfile()}
        onSkip={onSkip}
      />,
    );

    const surface = container.firstChild as HTMLElement;
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 200 });
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 150 });
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('emits audio cue plans for meteor and star synchronization', () => {
    const onAudioCuePlan = vi.fn();
    render(<StartupSplash phase="visible" progress={40} profile={createProfile()} onSkip={() => {}} onAudioCuePlan={onAudioCuePlan} />);

    expect(onAudioCuePlan).toHaveBeenCalled();
    const cues = onAudioCuePlan.mock.calls.at(-1)?.[0];
    expect(Array.isArray(cues)).toBe(true);
    expect(cues.some((cue: { type: string }) => cue.type === 'meteor-pass')).toBe(true);
    expect(cues.some((cue: { type: string }) => cue.type === 'star-cluster')).toBe(true);
  });

  it('reports runtime performance and degrades quality when fps is low', () => {
    let frameTime = 0;
    const frameQueue: FrameRequestCallback[] = [];
    const onPerformanceReport = vi.fn();
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback);
      return frameQueue.length;
    });
    window.cancelAnimationFrame = vi.fn();

    render(<StartupSplash phase="visible" progress={40} profile={createProfile()} onSkip={() => {}} onPerformanceReport={onPerformanceReport} />);

    act(() => {
      while (frameQueue.length > 0 && onPerformanceReport.mock.calls.length === 0) {
        const callback = frameQueue.shift();
        if (!callback) break;
        frameTime += 28;
        callback(frameTime);
      }
    });

    expect(onPerformanceReport).toHaveBeenCalledTimes(1);
    expect(onPerformanceReport.mock.calls[0][0].recommendedQuality).toBe('reduced');
    expect(screen.getByTestId('startup-splash')).toHaveAttribute('data-quality-mode', 'reduced');

    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });
});
