import React from 'react';
import { Pause, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MixerChannel } from '../shared/types';

export const NatureView: React.FC<{
  channels: MixerChannel[];
  toggleChannel: (id: string) => void;
  setVolume: (id: string, vol: number) => void;
  isMixerPlaying: boolean;
  toggleMixer: () => void;
  statusLabel: string;
}> = ({ channels, toggleChannel, setVolume, isMixerPlaying, toggleMixer, statusLabel }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 px-6 max-w-4xl mx-auto pb-32">
      <div className="mb-12">
        <p className="font-label uppercase tracking-[0.2em] text-[10px] text-primary mb-2">氛围音效</p>
        <h2 className="font-headline text-4xl font-light tracking-tight text-on-surface">白噪音混音器</h2>
      </div>

      <div className="space-y-6 mb-16">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className={`p-6 rounded-xl relative overflow-hidden group transition-all duration-500 ${
              ch.active ? 'bg-surface-container-high' : 'bg-surface-container-low border border-outline-variant/10'
            }`}
          >
            {ch.active && (
              <div className="absolute top-0 right-0 p-4">
                <span className="text-[10px] font-label uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  开启
                </span>
              </div>
            )}
            <div className="flex items-center gap-6 mb-8">
              <button
                onClick={() => toggleChannel(ch.id)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  ch.active ? 'bg-primary-container text-primary shadow-[0_0_20px_rgba(233,195,73,0.15)]' : 'bg-surface-container-highest text-secondary'
                }`}
              >
                <ch.icon size={28} />
              </button>
              <div className="flex-1">
                <h3 className={`font-headline text-xl text-on-surface ${!ch.active && 'opacity-80'}`}>{ch.title}</h3>
                <p className="text-xs text-on-surface-variant tracking-wide font-light">{ch.desc}</p>
              </div>
            </div>
            <div className="relative h-12 flex items-center px-2">
              <div className="relative w-full h-1 bg-outline-variant/30 rounded-full">
                <div
                  className={`absolute h-full rounded-full transition-all ${ch.active ? 'bg-primary shadow-[0_0_10px_rgba(233,195,73,0.4)]' : 'bg-secondary/30'}`}
                  style={{ width: `${ch.vol}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ch.vol}
                  onChange={(e) => setVolume(ch.id, parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className={`absolute w-4 h-4 rounded-full -translate-x-1/2 top-1/2 -translate-y-1/2 transition-all pointer-events-none ${
                    ch.active
                      ? 'bg-primary shadow-[0_0_15px_rgba(233,195,73,0.6)] border-2 border-primary-container'
                      : 'bg-secondary border border-surface-container-low opacity-50'
                  }`}
                  style={{ left: `${ch.vol}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-5 mb-20">
        <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant">{statusLabel}</p>
        <div className="relative">
          <div
            className={`absolute inset-0 bg-primary/10 blur-[40px] rounded-full scale-150 transition-opacity duration-700 ${isMixerPlaying ? 'opacity-100' : 'opacity-0'}`}
          />
          <button
            onClick={toggleMixer}
            className="relative w-24 h-24 rounded-full bg-surface-container-highest flex items-center justify-center shadow-xl border border-primary/10 group overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {isMixerPlaying ? (
                <motion.div key="pause" initial={{ scale: 0.5, opacity: 0, rotate: -45 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0, rotate: 45 }}>
                  <Pause size={48} className="text-primary" fill="currentColor" />
                </motion.div>
              ) : (
                <motion.div key="play" initial={{ scale: 0.5, opacity: 0, rotate: -45 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0, rotate: 45 }}>
                  <Play size={48} className="text-primary ml-1" fill="currentColor" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

