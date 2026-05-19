import { useState, useEffect } from 'react';
import { ZenState } from '../shared/types';

export function useZen() {
  const [zen, setZen] = useState<ZenState>({ isActive: false, phase: 'idle', count: 0 });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (zen.isActive) {
      if (zen.phase === 'idle') {
        setZen((prev) => ({ ...prev, phase: 'inhale', count: 4 }));
      }

      timer = setInterval(() => {
        setZen((prev) => {
          if (prev.count > 1) return { ...prev, count: prev.count - 1 };
          if (prev.phase === 'inhale') return { ...prev, phase: 'hold', count: 7 };
          if (prev.phase === 'hold') return { ...prev, phase: 'exhale', count: 8 };
          if (prev.phase === 'exhale') return { ...prev, phase: 'inhale', count: 4 };
          return prev;
        });
      }, 1000);
    } else {
      setZen((prev) => ({ ...prev, phase: 'idle', count: 0 }));
    }
    return () => clearInterval(timer);
  }, [zen.isActive]);

  const toggleZen = () => {
    setZen((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  return { zen, toggleZen };
}
