import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { DreamJournalModule } from './DreamJournalModule';

type DreamJournalVisualTheme = 'obsidian' | 'dawn';

const starParticles = [
  { top: '8%', left: '10%', size: 2, opacity: 0.82, duration: '5.8s', delay: '-1.4s' },
  { top: '12%', left: '22%', size: 3, opacity: 0.7, duration: '4.4s', delay: '-0.8s' },
  { top: '10%', left: '35%', size: 2, opacity: 0.92, duration: '6.6s', delay: '-2.6s' },
  { top: '16%', left: '48%', size: 4, opacity: 0.65, duration: '7.2s', delay: '-1.1s' },
  { top: '9%', left: '61%', size: 2, opacity: 0.76, duration: '5.2s', delay: '-3.2s' },
  { top: '14%', left: '74%', size: 3, opacity: 0.88, duration: '4.8s', delay: '-2.1s' },
  { top: '18%', left: '86%', size: 2, opacity: 0.68, duration: '6.9s', delay: '-1.7s' },
  { top: '24%', left: '8%', size: 3, opacity: 0.78, duration: '5.1s', delay: '-2.8s' },
  { top: '28%', left: '20%', size: 2, opacity: 0.62, duration: '7.4s', delay: '-0.6s' },
  { top: '26%', left: '33%', size: 4, opacity: 0.9, duration: '5.7s', delay: '-3.5s' },
  { top: '32%', left: '44%', size: 2, opacity: 0.74, duration: '6.1s', delay: '-2.4s' },
  { top: '30%', left: '58%', size: 3, opacity: 0.84, duration: '4.9s', delay: '-1.2s' },
  { top: '22%', left: '69%', size: 2, opacity: 0.72, duration: '6.7s', delay: '-2.7s' },
  { top: '27%', left: '82%', size: 3, opacity: 0.95, duration: '5.6s', delay: '-0.9s' },
  { top: '38%', left: '12%', size: 2, opacity: 0.68, duration: '6.3s', delay: '-2.9s' },
  { top: '43%', left: '26%', size: 4, opacity: 0.88, duration: '5s', delay: '-1.3s' },
  { top: '40%', left: '39%', size: 2, opacity: 0.8, duration: '7.6s', delay: '-3.1s' },
  { top: '46%', left: '52%', size: 3, opacity: 0.73, duration: '5.4s', delay: '-2.2s' },
  { top: '42%', left: '67%', size: 2, opacity: 0.94, duration: '6.5s', delay: '-1.5s' },
  { top: '48%', left: '79%', size: 4, opacity: 0.7, duration: '4.7s', delay: '-3.4s' },
  { top: '58%', left: '9%', size: 2, opacity: 0.76, duration: '5.9s', delay: '-1.8s' },
  { top: '61%', left: '23%', size: 3, opacity: 0.82, duration: '7.1s', delay: '-2.5s' },
  { top: '56%', left: '36%', size: 2, opacity: 0.67, duration: '5.3s', delay: '-0.7s' },
  { top: '63%', left: '49%', size: 4, opacity: 0.9, duration: '6.2s', delay: '-3.3s' },
  { top: '60%', left: '63%', size: 2, opacity: 0.72, duration: '4.5s', delay: '-1.6s' },
  { top: '68%', left: '76%', size: 3, opacity: 0.86, duration: '5.5s', delay: '-2.3s' },
  { top: '72%', left: '88%', size: 2, opacity: 0.74, duration: '7s', delay: '-0.5s' },
  { top: '80%', left: '16%', size: 3, opacity: 0.92, duration: '5.6s', delay: '-1.9s' },
  { top: '84%', left: '31%', size: 2, opacity: 0.69, duration: '6.4s', delay: '-2.6s' },
  { top: '79%', left: '46%', size: 4, opacity: 0.83, duration: '4.6s', delay: '-1.4s' },
  { top: '86%', left: '59%', size: 2, opacity: 0.76, duration: '7.3s', delay: '-3s' },
  { top: '82%', left: '72%', size: 3, opacity: 0.87, duration: '5.2s', delay: '-2s' },
  { top: '89%', left: '84%', size: 2, opacity: 0.71, duration: '6.8s', delay: '-0.9s' },
];

const constellationLines = [
  { x1: 14, y1: 26, x2: 23, y2: 21 },
  { x1: 23, y1: 21, x2: 31, y2: 28 },
  { x1: 31, y1: 28, x2: 38, y2: 24 },
  { x1: 64, y1: 18, x2: 72, y2: 22 },
  { x1: 72, y1: 22, x2: 79, y2: 17 },
  { x1: 79, y1: 17, x2: 86, y2: 24 },
  { x1: 57, y1: 63, x2: 66, y2: 58 },
  { x1: 66, y1: 58, x2: 74, y2: 64 },
  { x1: 74, y1: 64, x2: 81, y2: 60 },
];

const getVisualTheme = (): DreamJournalVisualTheme => {
  if (typeof document === 'undefined') {
    return 'obsidian';
  }

  return document.documentElement.dataset.theme === 'dawn' ? 'dawn' : 'obsidian';
};

export const DreamJournalView = ({
  user,
  confirmSensitiveActions = true,
  onBack,
}: {
  user?: User | null;
  confirmSensitiveActions?: boolean;
  onBack: () => void;
}) => {
  const [visualTheme, setVisualTheme] = useState<DreamJournalVisualTheme>(getVisualTheme);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const syncTheme = () => setVisualTheme(getVisualTheme());
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  const isDawn = visualTheme === 'dawn';
  const rootClassName = `dream-journal-nightscape dream-journal-theme-${visualTheme} relative isolate min-h-[100dvh] overflow-hidden`;
  const backButtonClass = isDawn
    ? 'inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-950/12 bg-white/60 px-4 text-sm text-amber-950/70 backdrop-blur-md transition-colors hover:bg-white/72 hover:text-amber-950'
    : 'inline-flex min-h-11 items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 text-sm text-white/80 backdrop-blur-md transition-colors hover:bg-white/14 hover:text-white';
  const eyebrowClass = isDawn ? 'text-[10px] font-label uppercase tracking-[0.3em] text-amber-900/55' : 'text-[10px] font-label uppercase tracking-[0.3em] text-sky-100/70';
  const titleClass = isDawn
    ? 'font-headline text-4xl text-slate-950 drop-shadow-[0_10px_24px_rgba(255,250,240,0.45)] sm:text-5xl'
    : 'font-headline text-4xl text-white drop-shadow-[0_6px_24px_rgba(2,6,23,0.65)] sm:text-5xl';
  const descriptionClass = isDawn ? 'max-w-2xl text-sm leading-7 text-amber-950/72 sm:text-base' : 'max-w-2xl text-sm leading-7 text-slate-200/82 sm:text-base';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.25 } }}
      exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
      className={rootClassName}
      data-testid="dream-journal-nightscape"
      data-visual-theme={visualTheme}
    >
    <div aria-hidden className="dream-journal-sky absolute inset-0" />
    <div aria-hidden className="dream-journal-milkyway absolute inset-x-[-18%] top-[10%] h-[32%] sm:top-[8%] sm:h-[28%]" />
    <div aria-hidden className="dream-journal-glow dream-journal-glow-left absolute left-[-12%] top-[16%] h-72 w-72 sm:h-96 sm:w-96" />
    <div aria-hidden className="dream-journal-glow dream-journal-glow-right absolute right-[-10%] top-[42%] h-80 w-80 sm:h-[28rem] sm:w-[28rem]" />

    <div aria-hidden className="dream-journal-starfield absolute inset-0">
      {starParticles.map((star, index) => (
        <span
          key={`${star.top}-${star.left}-${index}`}
          className="dream-journal-star absolute rounded-full"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDuration: star.duration,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>

    <svg aria-hidden viewBox="0 0 100 100" className="dream-journal-constellation absolute inset-x-0 top-[10%] h-[38%] w-full">
      {constellationLines.map((line, index) => (
        <line
          key={`${line.x1}-${line.y1}-${index}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className="dream-journal-constellation-line"
        />
      ))}
    </svg>

    <div aria-hidden className="dream-journal-vignette absolute inset-0" />

    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 pb-24 pt-24 sm:px-6 sm:pb-28">
      <section className="dream-journal-hero-panel px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3">
          <button onClick={onBack} className={backButtonClass}>
            <ArrowLeft size={16} />
            返回首页
          </button>
          <div className="space-y-2">
            <p className={eyebrowClass}>Morning Dream Log</p>
            <h2 className={titleClass}>晨间梦境记录</h2>
            <p className={descriptionClass}>
              在宁静的夜空里集中整理今天的梦境片段、历史时间轴、提醒与导出，让回忆和解读都沉浸在更贴合主题的观星氛围里。
            </p>
          </div>
        </div>
      </section>

      <div className="dream-journal-module-shell mt-8">
        <DreamJournalModule user={user} confirmSensitiveActions={confirmSensitiveActions} visualTheme={visualTheme} />
      </div>
    </div>
  </motion.div>
  );
};
