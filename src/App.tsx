/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Droplets, Waves, Wind } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { featuredJourneys } from './features/home/data';
import { MenuSheet, SettingsSheet } from './features/layout/OverlaySheets';
import { StartupSplash } from './features/layout/StartupSplash';
import { useNatureMixer } from './features/nature/model';
import { MixerChannel, PlaybackSnapshot, PlayerContent } from './features/shared/types';
import { useZen } from './features/zen/model';
import { loadPlayerState, savePlayerState } from './lib/player-storage';
import { AppTheme, appendPreferenceHistory, applyPreferencesToDocument, AppPreferences, loadPreferenceHistory, loadPreferences, savePreferences } from './lib/preferences';
import { useHashRoute } from './lib/routing';
import { useStartupSequence } from './lib/startup';
import { supabase } from './lib/supabase';
import { captureError, trackEvent } from './lib/telemetry';
import { isAdmin } from './lib/admin';

const TopBar = lazy(() => import('./features/layout/TopBar').then((m) => ({ default: m.TopBar })));
const BottomNav = lazy(() => import('./features/layout/BottomNav').then((m) => ({ default: m.BottomNav })));
const HomeView = lazy(() => import('./features/home/HomeView').then((m) => ({ default: m.HomeView })));
const DreamJournalView = lazy(() => import('./features/home/DreamJournalView').then((m) => ({ default: m.DreamJournalView })));
const NatureView = lazy(() => import('./features/nature/NatureView').then((m) => ({ default: m.NatureView })));
const ZenView = lazy(() => import('./features/zen/ZenView').then((m) => ({ default: m.ZenView })));
const MeView = lazy(() => import('./features/me/MeView').then((m) => ({ default: m.MeView })));
const PlayerView = lazy(() => import('./features/player/PlayerView').then((m) => ({ default: m.PlayerView })));
const AdminView = lazy(() => import('./features/admin/AdminView').then((m) => ({ default: m.AdminView })));

export default function App() {
  const storedPlayerState = loadPlayerState();
  const { route, navigate } = useHashRoute();
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());
  const [preferencesStatus, setPreferencesStatus] = useState('');
  const [preferenceHistory, setPreferenceHistory] = useState(() => loadPreferenceHistory());
  const [currentContent, setCurrentContent] = useState<PlayerContent>(
    featuredJourneys.find((content) => content.id === storedPlayerState.contentId) ?? featuredJourneys[0],
  );
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>(storedPlayerState.snapshot);

  const defaultChannels: MixerChannel[] = [
    { id: 'rain', title: '夏日雨声', desc: '落在雪松木上的温暖降雨', icon: Droplets, active: true, vol: 72, audioUrl: '/audio/summer-rain.MP3' },
    { id: 'ocean', title: '深邃海洋', desc: '暗流涌动与节奏性的潮汐', icon: Waves, active: false, vol: 25, audioUrl: '/audio/deep-ocean.MP3' },
    { id: 'wind', title: '森林微风', desc: '穿过古老松树的阵阵微风', icon: Wind, active: false, vol: 40, audioUrl: '/audio/forest-breeze.MP3' },
  ];
  const { channels, toggleChannel, setVolume, isMixerPlaying, toggleMixer, statusLabel } = useNatureMixer(defaultChannels);

  const { zen, toggleZen } = useZen();
  const [user, setUser] = useState<User | null>(null);
  const activeView = route.view;
  const showPlayer = Boolean(route.playerContentId);
  const canAccessAdmin = isAdmin(user?.email ?? null);
  const { phase: startupPhase, progress: startupProgress, profile: startupProfile, skip: skipStartup } = useStartupSequence(
    [currentContent.imageUrl, ...featuredJourneys.slice(0, 3).map((content) => content.imageUrl)],
  );

  useEffect(() => {
    applyPreferencesToDocument(preferences);
  }, [preferences]);

  useEffect(() => {
    if (typeof window === 'undefined' || preferences.theme !== 'system' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeSync = () => applyPreferencesToDocument(preferences);
    handleThemeSync();
    media.addEventListener?.('change', handleThemeSync);
    return () => media.removeEventListener?.('change', handleThemeSync);
  }, [preferences]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser()
      .then(({ data }) => {
        if (isMounted) setUser(data.user ?? null);
      })
      .catch((error) => captureError('auth.getUser', error));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    trackEvent('view_change', {
      view: activeView,
      playerOpen: showPlayer,
    });
  }, [activeView, showPlayer]);

  useEffect(() => {
    if (!route.playerContentId) {
      return;
    }

    const nextContent = featuredJourneys.find((content) => content.id === route.playerContentId);
    if (!nextContent) {
      navigate({ view: route.view, playerContentId: null });
      return;
    }

    if (currentContent.id !== nextContent.id) {
      setPlaybackSnapshot({ currentTime: 0, duration: 0 });
    }
    setCurrentContent(nextContent);
  }, [currentContent.id, navigate, route.playerContentId, route.view]);

  useEffect(() => {
    savePlayerState(currentContent.id, playbackSnapshot);
  }, [currentContent.id, playbackSnapshot]);

  const openPlayerForContent = (content: PlayerContent) => {
    const isSameContent = currentContent.id === content.id;
    setCurrentContent(content);
    setPlaybackSnapshot(isSameContent ? playbackSnapshot : { currentTime: 0, duration: 0 });
    setIsPlayerPlaying(true);
    navigate({ view: activeView, playerContentId: content.id });
    trackEvent('player_open', { contentId: content.id, sourceView: activeView });
  };

  const openCurrentPlayer = () => {
    setIsPlayerPlaying(true);
    navigate({ view: activeView, playerContentId: currentContent.id });
    trackEvent('player_resume', { contentId: currentContent.id, sourceView: activeView });
  };

  const handleToggleChannel = (channelId: string) => {
    toggleChannel(channelId);
    trackEvent('mixer_channel_toggle', { channelId });
  };

  const handleSetVolume = (channelId: string, volume: number) => {
    setVolume(channelId, volume);
    trackEvent('mixer_volume_change', { channelId, volume });
  };

  const handleToggleMixer = () => {
    toggleMixer();
    trackEvent('mixer_play_toggle', {
      activeChannels: channels.filter((channel) => channel.active).map((channel) => channel.id),
    });
  };

  const commitPreferences = (next: AppPreferences, label: string, value: string) => {
    setPreferences(next);
    const saveResult = savePreferences(next);
    const historyResult = appendPreferenceHistory(label, value);
    setPreferenceHistory(historyResult.history);
    setPreferencesStatus(
      saveResult.ok && historyResult.ok ? `${label}已更新` : `设置保存异常：${saveResult.ok ? historyResult.error : saveResult.error}`,
    );
    trackEvent('preferences_update', { label, value });
  };

  const updateTheme = (theme: AppTheme) => {
    commitPreferences({ ...preferences, theme }, '主题模式', theme === 'obsidian' ? '曜夜' : theme === 'dawn' ? '晨曦' : '跟随系统');
  };

  const updateCompactMode = (compactMode: boolean) => {
    commitPreferences({ ...preferences, compactMode }, '紧凑布局', compactMode ? '开启' : '关闭');
  };

  const updateReduceMotion = (reduceMotion: boolean) => {
    commitPreferences({ ...preferences, reduceMotion }, '减少动态效果', reduceMotion ? '开启' : '关闭');
  };

  const updateNotification = (key: keyof AppPreferences['notifications'], value: boolean) => {
    commitPreferences(
      { ...preferences, notifications: { ...preferences.notifications, [key]: value } },
      '通知设置',
      `${key}:${value ? '开启' : '关闭'}`,
    );
  };

  const updateSecurity = (key: keyof AppPreferences['security'], value: boolean) => {
    commitPreferences(
      { ...preferences, security: { ...preferences.security, [key]: value } },
      '安全设置',
      `${key}:${value ? '开启' : '关闭'}`,
    );
  };

  const navigateToView = (nextView: typeof activeView) => {
    navigate({ view: nextView, playerContentId: null });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen obsidian-texture">
      <div
        className={`transition-opacity duration-300 ${
          startupPhase === 'done' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Suspense fallback={<div className="h-16" />}>
        <TopBar onOpenMenu={() => setIsMenuOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />
        </Suspense>
        
        <main className="relative">
          <Suspense fallback={<div className="pt-24 px-6 text-on-surface-variant">Loading...</div>}>
          <AnimatePresence mode="wait">
            {activeView === 'home' && (
              <HomeView
                key="home"
                user={user}
                confirmSensitiveActions={preferences.security.confirmSensitiveActions}
                currentContent={currentContent}
                playbackSnapshot={playbackSnapshot}
                isPlaying={isPlayerPlaying}
                onResumePlayer={openCurrentPlayer}
                onSelectContent={openPlayerForContent}
                onOpenDreamJournal={() => navigate({ view: 'dream-journal', playerContentId: null })}
              />
            )}
            {activeView === 'dream-journal' && (
              <DreamJournalView
                key="dream-journal"
                user={user}
                confirmSensitiveActions={preferences.security.confirmSensitiveActions}
                onBack={() => navigate({ view: 'home', playerContentId: null })}
              />
            )}
            {activeView === 'nature' && (
              <NatureView 
                key="nature" 
                channels={channels} 
                toggleChannel={handleToggleChannel} 
                setVolume={handleSetVolume}
                isMixerPlaying={isMixerPlaying}
                toggleMixer={handleToggleMixer}
                statusLabel={statusLabel}
              />
            )}
            {activeView === 'admin' && <AdminView key="admin" user={user} />}
              {activeView === 'zen' && <ZenView key="zen" zen={zen} toggleZen={toggleZen} />}
              {activeView === 'me' && (
                <MeView
                  user={user}
                  currentContent={currentContent}
                  onOpenContent={openPlayerForContent}
                  preferences={preferences}
                  preferencesStatus={preferencesStatus}
                  onThemeChange={updateTheme}
                  onCompactModeChange={updateCompactMode}
                  onReduceMotionChange={updateReduceMotion}
                  onNotificationToggle={updateNotification}
                  onSecurityToggle={updateSecurity}
                />
              )}
          </AnimatePresence>
          </Suspense>
        </main>

        <Suspense fallback={null}>
        <AnimatePresence>
          {showPlayer && (
            <PlayerView 
              key="player" 
              onClose={() => {
                setIsPlayerPlaying(false);
                navigate({ view: activeView, playerContentId: null });
                trackEvent('player_close', { contentId: currentContent.id, sourceView: activeView });
              }}
              isPlaying={isPlayerPlaying}
              togglePlay={() => setIsPlayerPlaying(!isPlayerPlaying)}
              user={user}
              content={currentContent}
              onPlaybackChange={setPlaybackSnapshot}
              savedSnapshot={playbackSnapshot}
            />
          )}
        </AnimatePresence>
        </Suspense>

        {!showPlayer && activeView !== 'dream-journal' && (
          <Suspense fallback={null}>
            <BottomNav
              activeView={activeView}
              setView={(nextView) => {
                navigate({ view: nextView, playerContentId: null });
              }}
            />
          </Suspense>
        )}

        <MenuSheet
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          activeView={activeView}
          onNavigate={navigateToView}
          onOpenPlayer={() => {
            openCurrentPlayer();
            setIsMenuOpen(false);
          }}
          canAccessAdmin={canAccessAdmin}
          currentContentTitle={currentContent.title}
          preferenceHistory={preferenceHistory}
          user={user}
        />
        <SettingsSheet
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          preferences={preferences}
          status={preferencesStatus}
          onThemeChange={updateTheme}
          onCompactModeChange={updateCompactMode}
          onReduceMotionChange={updateReduceMotion}
          onNotificationToggle={updateNotification}
          onSecurityToggle={updateSecurity}
        />
      </div>
      <StartupSplash phase={startupPhase} progress={startupProgress} profile={startupProfile} onSkip={skipStartup} />
    </div>
  );
}
