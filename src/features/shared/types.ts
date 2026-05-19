import type { LucideIcon } from 'lucide-react';

export type View = 'home' | 'zen' | 'nature' | 'me' | 'dream-journal' | 'player';
export type MainView = Exclude<View | 'admin', 'player'>;

export interface MixerChannel {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  active: boolean;
  vol: number;
  audioUrl?: string;
}

export interface PlayerContent {
  id: string;
  title: string;
  category: string;
  summary: string;
  durationLabel: string;
  level: string;
  imageUrl: string;
  audioUrl: string;
}

export interface PlaybackSnapshot {
  currentTime: number;
  duration: number;
}

export interface ZenState {
  isActive: boolean;
  phase: 'inhale' | 'hold' | 'exhale' | 'idle';
  count: number;
}
