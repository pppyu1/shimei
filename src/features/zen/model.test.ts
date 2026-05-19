import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useZen } from './model';

describe('Zen State Machine (useZen)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useZen());
    expect(result.current.zen).toEqual({
      isActive: false,
      phase: 'idle',
      count: 0,
    });
  });

  it('should transition to inhale phase when toggled', () => {
    const { result } = renderHook(() => useZen());

    act(() => {
      result.current.toggleZen();
    });

    expect(result.current.zen.isActive).toBe(true);

    // After first effect run, it should set phase to inhale and count to 4
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.zen).toEqual({
      isActive: true,
      phase: 'inhale',
      count: 4,
    });
  });

  it('should transition through inhale -> hold -> exhale phases correctly', () => {
    const { result } = renderHook(() => useZen());

    act(() => {
      result.current.toggleZen();
    });

    // Fast-forward to start of inhale
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.zen.phase).toBe('inhale');
    expect(result.current.zen.count).toBe(4);

    // Fast-forward 3 seconds, should still be inhale, count 1
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.zen.phase).toBe('inhale');
    expect(result.current.zen.count).toBe(1);

    // 1 more second, transition to hold (7 seconds)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.zen.phase).toBe('hold');
    expect(result.current.zen.count).toBe(7);

    // Fast-forward 7 seconds, transition to exhale (8 seconds)
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(result.current.zen.phase).toBe('exhale');
    expect(result.current.zen.count).toBe(8);

    // Fast-forward 8 seconds, transition back to inhale (4 seconds)
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.zen.phase).toBe('inhale');
    expect(result.current.zen.count).toBe(4);
  });

  it('should reset to idle state when toggled off', () => {
    const { result } = renderHook(() => useZen());

    act(() => {
      result.current.toggleZen(); // Turn on
    });

    act(() => {
      vi.advanceTimersByTime(2000); // Wait 2s
    });
    expect(result.current.zen.isActive).toBe(true);
    expect(result.current.zen.phase).toBe('inhale');

    act(() => {
      result.current.toggleZen(); // Turn off
    });

    // Check state after turning off
    expect(result.current.zen).toEqual({
      isActive: false,
      phase: 'idle',
      count: 0,
    });
  });
});
