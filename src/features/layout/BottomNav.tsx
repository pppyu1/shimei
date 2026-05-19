import { Flower2, Moon, User, Wind } from 'lucide-react';
import type { MainView } from '../shared/types';

export const BottomNav = ({
  activeView,
  setView,
}: {
  activeView: MainView;
  setView: (v: MainView) => void;
}) => {
  const navItems = [
    { id: 'home', label: '首页', icon: Moon },
    { id: 'zen', label: '禅定', icon: Flower2 },
    { id: 'nature', label: '自然', icon: Wind },
    { id: 'me', label: '我的', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-8 pb-8 pt-4 bg-surface/80 backdrop-blur-3xl rounded-t-[32px] shadow-[0_-4px_40px_rgba(233,195,73,0.06)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id as MainView)}
            className={`flex flex-col items-center justify-center transition-all duration-500 ${
              isActive ? 'text-primary scale-110' : 'text-secondary opacity-50 hover:opacity-100'
            }`}
          >
            <Icon size={24} fill={isActive ? 'currentColor' : 'none'} />
            <span className="text-[10px] font-label mt-1 tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

