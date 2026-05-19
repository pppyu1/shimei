import type { PlayerContent } from '../shared/types';
import fireAudio from '../../assets/audio/fire.MP3';
import oceanWaveAudio from '../../assets/audio/ocean-wave.MP3';
import rainAudio from '../../assets/audio/rain.MP3';

const createCoverDataUrl = ({
  title,
  subtitle,
  gradientStart,
  gradientEnd,
  accent,
  pattern,
}: {
  title: string;
  subtitle: string;
  gradientStart: string;
  gradientEnd: string;
  accent: string;
  pattern: string;
}) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${gradientStart}" />
          <stop offset="100%" stop-color="${gradientEnd}" />
        </linearGradient>
        <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.15" />
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)" />
      <circle cx="880" cy="160" r="150" fill="${accent}" opacity="0.18" filter="url(#blur)" />
      <circle cx="250" cy="720" r="210" fill="${accent}" opacity="0.12" filter="url(#blur)" />
      ${pattern}
      <rect x="88" y="88" width="1024" height="724" rx="42" fill="none" stroke="rgba(255,255,255,0.12)" />
      <text x="110" y="650" fill="rgba(255,255,255,0.72)" font-size="26" font-family="Inter, Arial, sans-serif" letter-spacing="8">${subtitle}</text>
      <text x="110" y="734" fill="white" font-size="76" font-family="Inter, Arial, sans-serif" font-weight="700">${title}</text>
    </svg>
  `)}`;

export const featuredJourneys: PlayerContent[] = [
  {
    id: 'sleep-story-interstellar-v1',
    title: '窗畔轻雨',
    category: '雨声白噪',
    summary: '像夜雨落在窗边一样细密柔和，能轻轻遮盖环境杂音，把注意力慢慢带回平静呼吸。',
    durationLabel: '本地音频',
    level: '轻柔',
    imageUrl: createCoverDataUrl({
      title: '窗畔轻雨',
      subtitle: 'RAIN NOISE',
      gradientStart: '#0b1220',
      gradientEnd: '#16263f',
      accent: '#7db7ff',
      pattern: `
        <g opacity="0.42" stroke="rgba(255,255,255,0.26)" stroke-width="3">
          <path d="M220 140 L170 260" />
          <path d="M340 110 L292 224" />
          <path d="M510 160 L462 276" />
          <path d="M710 120 L660 240" />
          <path d="M900 180 L848 302" />
          <path d="M1030 132 L982 244" />
        </g>
        <path d="M0 620 C120 580 210 660 320 620 C460 568 540 680 680 632 C820 586 930 654 1200 596 L1200 900 L0 900 Z" fill="url(#glow)" opacity="0.45" />
      `,
    }),
    audioUrl: rainAudio,
  },
  {
    id: 'sleep-story-temple-v1',
    title: '深海潮声',
    category: '海浪白噪',
    summary: '海浪缓慢推近又退远，节律均匀不突兀，适合想在重复自然声里逐步沉静下来的人。',
    durationLabel: '本地音频',
    level: '深沉',
    imageUrl: createCoverDataUrl({
      title: '深海潮声',
      subtitle: 'OCEAN TIDE',
      gradientStart: '#081a2d',
      gradientEnd: '#0b4d63',
      accent: '#8fdcff',
      pattern: `
        <path d="M0 540 C90 500 170 500 260 540 C360 584 430 584 520 540 C620 490 700 496 790 540 C900 592 980 590 1200 522" fill="none" stroke="rgba(255,255,255,0.36)" stroke-width="10" stroke-linecap="round" />
        <path d="M0 620 C120 584 210 582 310 620 C420 664 500 664 590 620 C700 568 780 568 870 620 C980 684 1040 678 1200 632" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="12" stroke-linecap="round" />
        <path d="M0 690 C150 660 240 650 350 690 C470 734 560 734 660 690 C780 636 870 642 980 690 C1080 730 1130 724 1200 712 L1200 900 L0 900 Z" fill="url(#glow)" opacity="0.5" />
      `,
    }),
    audioUrl: oceanWaveAudio,
  },
  {
    id: 'sleep-story-ocean-v1',
    title: '炉火余温',
    category: '篝火白噪',
    summary: '细小火苗和木柴轻响更有包裹感，像夜里守着暖光一样，适合慢慢放松进入睡前状态。',
    durationLabel: '本地音频',
    level: '温暖',
    imageUrl: createCoverDataUrl({
      title: '炉火余温',
      subtitle: 'FIREPLACE',
      gradientStart: '#160f12',
      gradientEnd: '#43221b',
      accent: '#ffb36b',
      pattern: `
        <ellipse cx="600" cy="650" rx="260" ry="120" fill="rgba(255,179,107,0.12)" />
        <path d="M600 300 C520 420 508 500 600 610 C694 508 674 412 600 300 Z" fill="url(#glow)" opacity="0.92" />
        <path d="M600 366 C546 446 548 500 600 562 C652 500 650 438 600 366 Z" fill="rgba(255,245,228,0.72)" opacity="0.72" />
        <rect x="428" y="640" width="344" height="24" rx="12" fill="rgba(48,26,20,0.72)" />
        <rect x="474" y="672" width="252" height="22" rx="11" fill="rgba(63,32,24,0.82)" />
      `,
    }),
    audioUrl: fireAudio,
  },
];
