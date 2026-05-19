import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronRight, Moon, Play, Settings, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { formatTime } from '../player/model';
import { featuredJourneys } from './data';
import type { PlaybackSnapshot, PlayerContent } from '../shared/types';
import { fetchProfile } from '../../lib/api';
import { HomeIntentId, loadHomeIntentState, saveHomeIntentState, updateHomeIntentState } from '../../lib/home-intents';
import { getDreamJournalSummary } from '../../lib/dream-journal';
import { buildGreetingMessage } from './greeting';

interface HomeViewProps {
  user?: User | null;
  confirmSensitiveActions?: boolean;
  currentContent: PlayerContent;
  playbackSnapshot: PlaybackSnapshot;
  isPlaying: boolean;
  onResumePlayer: () => void;
  onSelectContent: (content: PlayerContent) => void;
  onOpenDreamJournal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  confirmSensitiveActions = true,
  currentContent,
  playbackSnapshot,
  isPlaying,
  onResumePlayer,
  onSelectContent,
  onOpenDreamJournal,
}) => {
  const remainingSeconds = Math.max(0, playbackSnapshot.duration - playbackSnapshot.currentTime);
  const progressPct = playbackSnapshot.duration ? Math.min(100, (playbackSnapshot.currentTime / playbackSnapshot.duration) * 100) : 0;
  const continueLabel = playbackSnapshot.duration
    ? `剩余 ${formatTime(remainingSeconds)} • ${currentContent.category}`
    : `${currentContent.durationLabel} • ${currentContent.category}`;
  const [intentState, setIntentState] = useState(() => loadHomeIntentState());
  const [intentStatus, setIntentStatus] = useState('');
  const [dreamSummary, setDreamSummary] = useState(() => getDreamJournalSummary());
  const [now, setNow] = useState(() => new Date());
  const [displayName, setDisplayName] = useState<string | null>(null);

  const intentOptions: { id: HomeIntentId; label: string; desc: string }[] = [
    { id: 'relax', label: '放松', desc: '缓慢降噪，让呼吸回到平稳' },
    { id: 'anxiety', label: '缓解焦虑', desc: '把注意力从思绪拉回当下' },
    { id: 'sleep', label: '深度睡眠', desc: '更长、更沉的入睡旅程' },
    { id: 'focus', label: '专注', desc: '提升沉浸感与连贯性' },
  ];

  const intentLabel = useMemo(
    () => intentOptions.find((it) => it.id === intentState.selectedIntent)?.label ?? '放松',
    [intentOptions, intentState.selectedIntent],
  );

  const sortedJourneys = useMemo(() => {
    const rank: Record<HomeIntentId, string[]> = {
      relax: ['sleep-story-interstellar-v1', 'sleep-story-ocean-v1', 'sleep-story-temple-v1'],
      anxiety: ['sleep-story-interstellar-v1', 'sleep-story-temple-v1', 'sleep-story-ocean-v1'],
      sleep: ['sleep-story-temple-v1', 'sleep-story-interstellar-v1', 'sleep-story-ocean-v1'],
      focus: ['sleep-story-ocean-v1', 'sleep-story-temple-v1', 'sleep-story-interstellar-v1'],
    };

    const priorities = rank[intentState.selectedIntent] ?? [];
    const byId = new Map(featuredJourneys.map((j) => [j.id, j]));
    const ranked = priorities.map((id) => byId.get(id)).filter(Boolean) as PlayerContent[];
    const rest = featuredJourneys.filter((j) => !priorities.includes(j.id));
    return [...ranked, ...rest];
  }, [intentState.selectedIntent]);

  const selectIntent = (next: HomeIntentId) => {
    setIntentStatus('');
    const nextState = updateHomeIntentState(intentState, next);
    setIntentState(nextState);
    const result = saveHomeIntentState(nextState);
    setIntentStatus(result.ok ? `已切换为「${intentOptions.find((i) => i.id === next)?.label ?? next}」` : `保存失败：${result.error}`);
  };

  useEffect(() => {
    const refreshSummary = () => setDreamSummary(getDreamJournalSummary());
    refreshSummary();
    window.addEventListener('focus', refreshSummary);
    return () => window.removeEventListener('focus', refreshSummary);
  }, []);

  useEffect(() => {
    let timerId: number | null = null;

    const scheduleRefresh = () => {
      const currentTime = new Date();
      const delay = 60_000 - (currentTime.getSeconds() * 1000 + currentTime.getMilliseconds());

      timerId = window.setTimeout(() => {
        setNow(new Date());
        scheduleRefresh();
      }, delay);
    };

    setNow(new Date());
    scheduleRefresh();

    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setDisplayName(null);
      return () => {
        cancelled = true;
      };
    }

    setDisplayName(null);

    void fetchProfile(user.id)
      .then((profile) => {
        if (!cancelled) {
          setDisplayName(typeof profile?.display_name === 'string' ? profile.display_name : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayName(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const greetingMessage = useMemo(() => buildGreetingMessage(now, user, displayName), [displayName, now, user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pt-24 px-6 max-w-5xl mx-auto space-y-12 pb-32"
    >
      <section className="space-y-8">
        <div className="space-y-1">
          <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant">晚间回顾</span>
          <h2 className="font-headline text-5xl md:text-6xl tracking-tight text-on-surface">{greetingMessage}</h2>
        </div>

        <div
          onClick={onResumePlayer}
          className="relative group cursor-pointer overflow-hidden rounded-[32px] aspect-[16/10] md:aspect-[21/9] bg-surface-container-low"
        >
          <img
            src={currentContent.imageUrl}
            alt={currentContent.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 space-y-4">
            <div className="space-y-2">
              <span className="font-label text-xs tracking-widest text-primary font-semibold uppercase">继续播放</span>
              <h3 className="font-headline text-3xl text-on-surface">{currentContent.title}</h3>
              <p className="text-on-surface-variant max-w-xs text-sm">{continueLabel}</p>
            </div>
            <div className="w-full h-[2px] bg-surface-variant relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_8px_rgba(233,195,73,0.6)]" style={{ width: `${progressPct || 8}%` }} />
            </div>
          </div>
          <div className="absolute top-8 right-8 w-14 h-14 glass-panel rounded-full flex items-center justify-center border-[0.5px] border-primary/20 text-primary">
            <Play size={28} fill="currentColor" className={isPlaying ? 'opacity-70' : ''} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-low p-8 rounded-[32px] space-y-4 border-[0.5px] border-outline-variant/10">
          <div className="flex justify-between items-center">
            <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">平均睡眠</span>
            <Moon size={16} className="text-primary/40" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-light text-on-surface">7.5</span>
            <span className="text-on-surface-variant font-label text-sm uppercase tracking-wider">小时</span>
          </div>
          <div className="pt-4 flex gap-1 items-end h-12">
            {[40, 60, 30, 80, 90, 50, 70].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-lg ${i === 4 ? 'bg-primary shadow-[0_-4px_12px_rgba(233,195,73,0.1)]' : i === 3 ? 'bg-primary/40' : 'bg-surface-container-highest'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="bg-surface-container-low p-8 rounded-[32px] space-y-4 border-[0.5px] border-outline-variant/10">
          <div className="flex justify-between items-center">
            <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">睡眠质量</span>
            <Settings size={16} className="text-primary/40" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-light text-primary">92</span>
            <span className="text-on-surface-variant font-label text-sm uppercase tracking-wider">/ 100</span>
          </div>
          <div className="pt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-container to-primary w-[92%]" />
            </div>
            <span className="text-[10px] font-label text-primary uppercase">+4% vs LW</span>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h4 className="font-headline text-2xl text-on-surface px-1">此刻意图</h4>
        <div className="flex flex-wrap gap-3">
          {intentOptions.map((opt) => {
            const active = intentState.selectedIntent === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => selectIntent(opt.id)}
                className={`px-6 py-3 rounded-full border transition-all duration-300 font-label text-xs uppercase tracking-widest ${
                  active
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/10 px-5 py-4 space-y-1">
          <p className="text-sm text-on-surface">当前意图：{intentLabel}</p>
          <p className="text-xs text-on-surface-variant">
            {intentOptions.find((i) => i.id === intentState.selectedIntent)?.desc ?? '选择一个意图以调整首页推荐顺序。'}
          </p>
          {intentState.history.length > 1 && (
            <p className="text-xs text-on-surface-variant">
              最近选择：{intentState.history.slice(0, 3).map((id) => intentOptions.find((i) => i.id === id)?.label ?? id).join(' / ')}
            </p>
          )}
          {intentStatus && <p className="text-xs text-on-surface-variant">{intentStatus}</p>}
        </div>
      </section>

      <section className="space-y-4">
        <button
          onClick={onOpenDreamJournal}
          className="w-full min-h-14 text-left rounded-3xl bg-surface-container-low p-5 sm:p-6 border border-outline-variant/10 hover:bg-surface-container-high transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-headline text-xl sm:text-2xl text-on-surface">晨间梦境记录</h3>
              <p className="text-sm text-on-surface-variant">
                进入独立页面记录与回看梦境，支持表单编辑、标签管理、时间轴、提醒和导出。
              </p>
              <p className="text-xs text-on-surface-variant">
                {dreamSummary.count
                  ? `已记录 ${dreamSummary.count} 条，最近一条：${dreamSummary.latestTitle ?? '未命名梦境'}`
                  : '今天还没有梦境记录，点击开始写下第一条片段'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className="inline-flex min-h-11 items-center px-4 rounded-full bg-primary/10 text-primary text-[10px] font-label uppercase tracking-[0.25em]">
                进入详情
              </span>
              <ChevronRight size={18} className="text-on-surface-variant/70" />
            </div>
          </div>
        </button>
      </section>

      <section className="space-y-8">
        <div className="flex justify-between items-end px-1">
          <h4 className="font-headline text-2xl text-on-surface">精选旅程</h4>
          <button className="text-primary font-label text-[10px] uppercase tracking-[0.2em] border-b border-primary/30 pb-1">
            查看全部
          </button>
        </div>
        <div className="space-y-6">
          {sortedJourneys.map((journey) => (
            <JourneyItem key={journey.id} content={journey} onSelectContent={onSelectContent} />
          ))}
        </div>
      </section>
    </motion.div>
  );
};

const JourneyItem: React.FC<{ content: PlayerContent; onSelectContent: (content: PlayerContent) => void }> = ({ content, onSelectContent }) => (
  <div
    onClick={() => onSelectContent(content)}
    className="group flex flex-col md:flex-row gap-6 p-4 rounded-[24px] hover:bg-surface-container-low transition-all duration-700 items-center cursor-pointer"
  >
    <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden relative">
      <img
        src={content.imageUrl}
        alt={content.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
    </div>
    <div className="flex-1 space-y-2 text-center md:text-left">
      <h5 className="font-headline text-xl text-on-surface">{content.title}</h5>
      <p className="text-on-surface-variant text-sm font-light leading-relaxed">{content.summary}</p>
      <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
        <span className="flex items-center gap-1 text-[10px] font-label text-on-surface-variant/60 uppercase tracking-widest">
          <Timer size={12} /> {content.durationLabel}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-label text-on-surface-variant/60 uppercase tracking-widest">
          <Settings size={12} /> {content.level}
        </span>
      </div>
    </div>
    <button className="p-4 rounded-full border border-outline-variant/10 group-hover:border-primary/40 text-on-surface-variant group-hover:text-primary transition-all duration-500">
      <ChevronRight size={20} />
    </button>
  </div>
);

