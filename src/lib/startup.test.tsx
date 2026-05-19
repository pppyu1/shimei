import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectStartupProfile, preloadStartupAssets, useStartupSequence } from './startup';

describe('startup utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects low power profile from reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    const profile = detectStartupProfile();
    expect(profile.lowPowerMode).toBe(true);
    expect(profile.minDurationMs).toBe(2000);
    expect(profile.maxDurationMs).toBe(2800);
    expect(profile.particleCount).toBe(36);
    expect(profile.meteorConfig.count).toBe(0);
    expect(profile.audioSync.enabled).toBe(false);
    expect(profile.performanceConfig.devicePixelRatioCap).toBe(1.2);
    expect(profile.bloomEnabled).toBe(false);
  });

  it('preloads assets and reports progress', async () => {
    const callbacks: Array<() => void> = [];
    vi.stubGlobal(
      'Image',
      class MockImage {
        onload: null | (() => void) = null;
        onerror: null | (() => void) = null;
        set src(_value: string) {
          callbacks.push(() => this.onload?.());
        }
      } as unknown as typeof Image,
    );

    const progress: number[] = [];
    const promise = preloadStartupAssets(['/a.png', '/b.png'], (value) => progress.push(value));
    callbacks.forEach((run) => run());
    await promise;

    expect(progress.at(-1)).toBe(100);
  });

  it('keeps the interaction layer until the fade completes after skip', async () => {
    vi.stubGlobal(
      'Image',
      class MockImage {
        onload: null | (() => void) = null;
        onerror: null | (() => void) = null;
        set src(_value: string) {
          this.onload?.();
        }
      } as unknown as typeof Image,
    );

    let latestPhase: string = '';
    const Harness = () => {
      const { phase, progress, skip } = useStartupSequence(['/hero.png']);
      latestPhase = phase;
      return (
        <div>
          <span>{phase}</span>
          <span>{progress}</span>
          <button onClick={skip}>skip</button>
        </div>
      );
    };

    render(<Harness />);
    expect(screen.getByText('visible')).toBeInTheDocument();
    expect(latestPhase).toBe('visible');

    fireEvent.click(screen.getByRole('button', { name: 'skip' }));
    expect(latestPhase).toBe('fading');

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    });

    expect(latestPhase).toBe('done');
  });

  it('stays done after skip even if delayed startup timers continue', async () => {
    const assetCallbacks: Array<() => void> = [];

    vi.stubGlobal(
      'Image',
      class MockImage {
        onload: null | (() => void) = null;
        onerror: null | (() => void) = null;
        set src(_value: string) {
          assetCallbacks.push(() => this.onload?.());
        }
      } as unknown as typeof Image,
    );

    let latestPhase: string = '';
    const Harness = () => {
      const { phase, skip } = useStartupSequence(['/hero.png']);
      latestPhase = phase;
      return (
        <div>
          <span>{phase}</span>
          <button onClick={skip}>skip</button>
        </div>
      );
    };

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'skip' }));
    expect(latestPhase).toBe('fading');

    await act(async () => {
      assetCallbacks.forEach((run) => run());
      await Promise.resolve();
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    });

    expect(latestPhase).toBe('done');
  });

  it('forces the splash to finish when asset preload hangs too long', async () => {
    vi.stubGlobal(
      'Image',
      class MockImage {
        onload: null | (() => void) = null;
        onerror: null | (() => void) = null;
        set src(_value: string) {
          // Simulate a hanging preload request that never resolves.
        }
      } as unknown as typeof Image,
    );

    let latestPhase: string = '';
    const Harness = () => {
      const { phase } = useStartupSequence(['/hero.png']);
      latestPhase = phase;
      return <span>{phase}</span>;
    };

    render(<Harness />);
    expect(latestPhase).toBe('visible');

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 3900));
    });

    expect(latestPhase).toBe('done');
  });
});
