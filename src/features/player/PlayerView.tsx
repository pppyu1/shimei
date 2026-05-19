import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronLeft, Download, FastForward, Pause, Play, RotateCcw, Settings, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import type { PlaybackSnapshot, PlayerContent } from '../shared/types';
import { cacheAudioForOffline, isOfflineReady, resolvePlayableAudioUrl, revokePlayableAudioUrl } from '../../lib/player-storage';
import { supabase } from '../../lib/supabase';
import { captureError, trackEvent } from '../../lib/telemetry';
import { formatTime, usePlayerProgress } from './model';

interface PlayerViewProps {
  onClose: () => void;
  isPlaying: boolean;
  togglePlay: () => void;
  user: User | null;
  content: PlayerContent;
  onPlaybackChange: (snapshot: PlaybackSnapshot) => void;
  savedSnapshot: PlaybackSnapshot;
}

export const PlayerView: React.FC<PlayerViewProps> = ({ onClose, isPlaying, togglePlay, user, content, onPlaybackChange, savedSnapshot }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastWriteAtRef = useRef(0);
  const { currentTime, setCurrentTime, duration, setDuration, progressPct } = usePlayerProgress();
  const timerOptions = useMemo(() => [15, 30, 45], []);
  const [selectedTimerMinutes, setSelectedTimerMinutes] = useState<number | null>(null);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState(0);
  const [audioSrc, setAudioSrc] = useState(content.audioUrl);
  const [offlineReady, setOfflineReady] = useState(isOfflineReady(content.id));
  const [offlineStatus, setOfflineStatus] = useState('');
  const [playbackError, setPlaybackError] = useState('');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch((error) => {
        const nextError = '当前浏览器拦截了自动播放，请再次点击播放';
        setPlaybackError(nextError);
        captureError('player.play', error, { contentId: content.id });
      });
    } else {
      audio.pause();
    }
  }, [content.id, isPlaying]);

  useEffect(() => {
    let cancelled = false;

    const hydrateAudioSource = async () => {
      try {
        const resolved = await resolvePlayableAudioUrl(content);
        if (cancelled) {
          revokePlayableAudioUrl(resolved.url);
          return;
        }

        if (objectUrlRef.current) {
          revokePlayableAudioUrl(objectUrlRef.current);
        }

        objectUrlRef.current = resolved.url.startsWith('blob:') ? resolved.url : null;
        setAudioSrc(resolved.url);
        setOfflineReady(resolved.fromCache || isOfflineReady(content.id));
        setOfflineStatus(resolved.fromCache ? '当前正在使用离线缓存播放' : '当前使用在线音频播放');
        setPlaybackError('');
      } catch (error) {
        captureError('player.resolveAudio', error, { contentId: content.id });
        setAudioSrc(content.audioUrl);
        setOfflineReady(isOfflineReady(content.id));
      }
    };

    void hydrateAudioSource();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        revokePlayableAudioUrl(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [content]);

  useEffect(() => {
    onPlaybackChange({ currentTime, duration });
  }, [currentTime, duration, onPlaybackChange]);

  useEffect(() => {
    if (!sleepTimerEndsAt) {
      setTimerRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((sleepTimerEndsAt - Date.now()) / 1000));
      setTimerRemainingSeconds(remaining);

      if (!remaining) {
        setSleepTimerEndsAt(null);
        setSelectedTimerMinutes(null);
        if (isPlaying) {
          togglePlay();
        }
        trackEvent('sleep_timer_complete', { contentId: content.id });
      }
    };

    updateRemaining();
    const timerId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timerId);
  }, [isPlaying, sleepTimerEndsAt, togglePlay]);

  const writeHistoryIfNeeded = async (timeSec: number) => {
    if (!user) return;
    const now = Date.now();
    if (now - lastWriteAtRef.current < 15000) return;
    lastWriteAtRef.current = now;
    try {
      await supabase.functions.invoke('sync-play-history', {
        body: {
          content_id: content.id,
          progress_seconds: Math.floor(timeSec),
        },
      });
    } catch (error) {
      captureError('player.syncPlayHistory', error, { contentId: content.id });
    }
  };

  const applySleepTimer = (minutes: number | null) => {
    if (minutes === null) {
      setSelectedTimerMinutes(null);
      setSleepTimerEndsAt(null);
      trackEvent('sleep_timer_cleared', { contentId: content.id });
      return;
    }

    setSelectedTimerMinutes(minutes);
    setSleepTimerEndsAt(Date.now() + minutes * 60 * 1000);
    trackEvent('sleep_timer_set', { contentId: content.id, minutes });
  };

  const downloadForOffline = async () => {
    try {
      setOfflineStatus('正在缓存当前音频，稍后可离线播放');
      await cacheAudioForOffline(content);
      const resolved = await resolvePlayableAudioUrl(content);
      if (objectUrlRef.current) {
        revokePlayableAudioUrl(objectUrlRef.current);
      }
      objectUrlRef.current = resolved.url.startsWith('blob:') ? resolved.url : null;
      setAudioSrc(resolved.url);
      setOfflineReady(true);
      setOfflineStatus('当前音频已缓存，下次断网仍可播放');
      trackEvent('offline_audio_cached', { contentId: content.id });
    } catch (error) {
      const nextError = error instanceof Error ? error.message : '离线缓存失败';
      setOfflineStatus(nextError);
      captureError('player.cacheAudioForOffline', error, { contentId: content.id });
    }
  };

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-[100] bg-[#08090C] text-on-surface font-body overflow-y-auto">
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const nextDuration = e.currentTarget.duration || 0;
          setDuration(nextDuration);
          if (savedSnapshot.currentTime > 0) {
            const resumeAt = Math.min(savedSnapshot.currentTime, Math.max(0, nextDuration - 1));
            e.currentTarget.currentTime = resumeAt;
            setCurrentTime(resumeAt);
          }
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime || 0;
          setCurrentTime(t);
          void writeHistoryIfNeeded(t);
        }}
        onError={() => {
          const nextError = offlineReady ? '离线音频读取失败，请重新缓存一次' : '音频加载失败，请检查网络后重试';
          setPlaybackError(nextError);
        }}
      />

      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-surface/95 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <ChevronLeft size={24} />
          </button>
          <span className="font-sans uppercase tracking-widest text-[10px] text-secondary">正在播放</span>
        </div>
        <h1 className="text-2xl font-headline italic text-primary">Sanctuary</h1>
        <button className="text-secondary hover:text-primary transition-colors">
          <Settings size={24} />
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 flex flex-col items-center max-w-2xl mx-auto">
        <div className="relative w-full aspect-[4/5] mb-12 group">
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary/20 to-transparent rounded-[2rem] blur-2xl opacity-30" />
          <div className="relative w-full h-full rounded-[2rem] overflow-hidden border-[0.5px] border-primary/10">
            <img
              src={content.imageUrl}
              alt={content.title}
              className={`w-full h-full object-cover transition-transform duration-[10000ms] ease-linear ${isPlaying ? 'scale-125' : 'scale-105'}`}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="w-full text-center mb-10">
          <span className="font-label uppercase tracking-[0.3em] text-[10px] text-on-surface-variant mb-3 block">{content.category}</span>
          <h2 className="font-headline text-4xl md:text-5xl tracking-tight text-on-surface mb-2">{content.title}</h2>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">{content.summary}</p>
          <p className="text-xs text-on-surface-variant mt-3">{offlineStatus}</p>
          {playbackError ? <p className="text-xs text-red-300 mt-2">{playbackError}</p> : null}
        </div>

        <div className="w-full mb-10">
          <div className="relative h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-on-surface-variant">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-10 mb-16">
          <button
            className="text-secondary hover:text-primary transition-all duration-500"
            onClick={() => {
              if (!audioRef.current) return;
              audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
            }}
          >
            <RotateCcw size={32} />
          </button>
          <button onClick={togglePlay} className="relative group">
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl transition-transform duration-300 active:scale-95">
              {isPlaying ? <Pause size={40} className="text-on-primary" fill="currentColor" /> : <Play size={40} className="text-on-primary ml-1" fill="currentColor" />}
            </div>
          </button>
          <button
            className="text-secondary hover:text-primary transition-all duration-500"
            onClick={() => {
              if (!audioRef.current) return;
              const limit = audioRef.current.duration || audioRef.current.currentTime + 15;
              audioRef.current.currentTime = Math.min(limit, audioRef.current.currentTime + 15);
            }}
          >
            <FastForward size={32} />
          </button>
        </div>

        <div className="w-full space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel py-5 px-6 rounded-2xl flex items-center justify-between border border-primary/10">
              <div className="flex flex-col items-start">
                <span className="font-label text-[10px] uppercase tracking-widest text-primary mb-1">时长</span>
                <span className="font-body text-sm font-semibold text-on-surface">
                  {sleepTimerEndsAt ? `剩余 ${formatTime(timerRemainingSeconds)}` : '未设置睡眠定时'}
                </span>
              </div>
              <Timer size={24} className="text-on-surface-variant" />
            </div>
            <button
              onClick={downloadForOffline}
              className="glass-panel py-5 px-6 rounded-2xl flex items-center justify-between border border-primary/10 hover:bg-surface-container-high transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="font-label text-[10px] uppercase tracking-widest text-primary mb-1">离线</span>
                <span className="font-body text-sm font-semibold text-on-surface">{offlineReady ? '已缓存当前音频' : '下载到本地缓存'}</span>
              </div>
              <Download size={24} className="text-on-surface-variant" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 w-full">
            {timerOptions.map((minutes) => (
              <button
                key={minutes}
                onClick={() => applySleepTimer(minutes)}
                className={`rounded-2xl py-4 px-3 border transition-colors font-label text-[10px] uppercase tracking-[0.25em] ${
                  selectedTimerMinutes === minutes
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-primary/30'
                }`}
              >
                {minutes} 分钟
              </button>
            ))}
            <button
              onClick={() => applySleepTimer(null)}
              className={`rounded-2xl py-4 px-3 border transition-colors font-label text-[10px] uppercase tracking-[0.25em] ${
                sleepTimerEndsAt === null
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-primary/30'
              }`}
            >
              关闭
            </button>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

