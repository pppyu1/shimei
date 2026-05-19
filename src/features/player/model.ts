import { useMemo, useState } from 'react';

export const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

export function usePlayerProgress() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progressPct = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  return { currentTime, setCurrentTime, duration, setDuration, progressPct };
}
