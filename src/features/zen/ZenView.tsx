import React from 'react';
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ZenState } from '../shared/types';

export const ZenView: React.FC<{ zen: ZenState; toggleZen: () => void }> = ({ zen, toggleZen }) => {
  const getPhaseText = () => {
    switch (zen.phase) {
      case 'inhale':
        return '吸气';
      case 'hold':
        return '屏息';
      case 'exhale':
        return '呼气';
      default:
        return '准备';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen pt-24 pb-32 px-6 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 nebula-glow pointer-events-none" />

      <section className="relative flex items-center justify-center mb-16">
        <motion.div
          animate={{ scale: zen.phase === 'inhale' ? 1.2 : zen.phase === 'exhale' ? 0.8 : 1, opacity: zen.phase === 'idle' ? 0.3 : 1 }}
          transition={{ duration: zen.phase === 'inhale' ? 4 : zen.phase === 'hold' ? 7 : 8, ease: 'easeInOut' }}
          className="absolute w-80 h-80 rounded-full bg-primary/5 blur-3xl"
        />

        <motion.div
          animate={{ scale: zen.phase === 'inhale' ? 1.1 : zen.phase === 'exhale' ? 0.9 : 1, boxShadow: zen.isActive ? '0 0 100px 30px rgba(233,195,73,0.1)' : '0 0 80px 20px rgba(233,195,73,0.05)' }}
          transition={{ duration: zen.phase === 'inhale' ? 4 : zen.phase === 'hold' ? 7 : 8, ease: 'easeInOut' }}
          className="relative w-72 h-72 rounded-full border border-outline-variant/10 flex items-center justify-center overflow-hidden bg-gradient-to-br from-secondary/5 to-primary/5"
        >
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.span key={zen.phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.6, y: 0 }} exit={{ opacity: 0, y: -10 }} className="block font-label text-[10px] tracking-[0.3em] uppercase text-secondary mb-2">
                {getPhaseText()}
              </motion.span>
            </AnimatePresence>
            <motion.span key={zen.count} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="block font-headline text-8xl text-primary font-light tracking-tighter">
              {zen.isActive ? zen.count : '•'}
            </motion.span>
          </div>
        </motion.div>
      </section>

      <section className="flex items-center gap-12 z-10">
        <button className="text-secondary hover:text-on-surface transition-colors duration-500">
          <RotateCcw size={32} />
        </button>
        <button onClick={toggleZen} className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300">
          {zen.isActive ? <Pause size={40} className="text-on-primary" fill="currentColor" /> : <Play size={40} className="text-on-primary ml-1" fill="currentColor" />}
        </button>
        <button className="text-secondary hover:text-on-surface transition-colors duration-500">
          <Volume2 size={32} />
        </button>
      </section>
    </motion.div>
  );
};

