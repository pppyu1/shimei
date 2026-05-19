import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { formatTime, usePlayerProgress } from './model';

describe('Player Model', () => {
  describe('formatTime', () => {
    it('should format seconds to MM:SS correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(9)).toBe('00:09');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(3599)).toBe('59:59');
      expect(formatTime(3600)).toBe('60:00');
    });

    it('should handle edge cases', () => {
      expect(formatTime(-10)).toBe('00:00'); // Assuming fallback to 0 for negative
      expect(formatTime(NaN)).toBe('00:00');
      expect(formatTime(Infinity)).toBe('00:00');
    });
  });

  describe('usePlayerProgress', () => {
    it('should calculate progress percentage correctly', () => {
      const { result } = renderHook(() => usePlayerProgress());

      // Initial state
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.progressPct).toBe(0);

      act(() => {
        result.current.setDuration(100);
      });
      expect(result.current.progressPct).toBe(0);

      act(() => {
        result.current.setCurrentTime(50);
      });
      expect(result.current.progressPct).toBe(50);

      act(() => {
        result.current.setCurrentTime(100);
      });
      expect(result.current.progressPct).toBe(100);
      
      // Should cap at 100%
      act(() => {
        result.current.setCurrentTime(150);
      });
      expect(result.current.progressPct).toBe(100);
    });
  });
});
