import type { MouseEvent, PointerEvent } from 'react';
import { Menu, Settings } from 'lucide-react';

const createPressHandlers = (onPress: () => void) => ({
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onPress();
  },
  onClick: (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onPress();
  },
});

export const TopBar = ({
  onOpenMenu,
  onOpenSettings,
}: {
  onOpenMenu: () => void;
  onOpenSettings: () => void;
}) => {
  const menuPressHandlers = createPressHandlers(onOpenMenu);
  const settingsPressHandlers = createPressHandlers(onOpenSettings);

  return (
    <header className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 h-16 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/10">
      <div className="max-w-6xl mx-auto h-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <button
          onPointerUp={menuPressHandlers.onPointerUp}
          onClick={menuPressHandlers.onClick}
          style={{ touchAction: 'manipulation' }}
          className="relative z-10 text-primary transition-colors inline-flex h-14 min-w-14 items-center justify-center gap-2 px-4 rounded-2xl leading-none align-middle shrink-0 bg-surface-container-low/70 border border-outline-variant/10 hover:bg-surface-container-high active:scale-[0.98] justify-self-start"
          aria-label="打开菜单"
        >
          <Menu size={24} className="pointer-events-none shrink-0" />
          <span className="hidden sm:inline text-[10px] leading-none font-label uppercase tracking-[0.25em] text-on-surface-variant pointer-events-none">
            菜单
          </span>
        </button>
        <div className="min-w-0 px-1 text-center pointer-events-none select-none" />
        <button
          onPointerUp={settingsPressHandlers.onPointerUp}
          onClick={settingsPressHandlers.onClick}
          style={{ touchAction: 'manipulation' }}
          className="relative z-10 text-primary transition-colors inline-flex h-14 min-w-14 items-center justify-center gap-2 px-4 rounded-2xl leading-none align-middle shrink-0 bg-surface-container-low/70 border border-outline-variant/10 hover:bg-surface-container-high active:scale-[0.98] justify-self-end"
          aria-label="打开设置"
        >
          <span className="hidden sm:inline text-[10px] leading-none font-label uppercase tracking-[0.25em] text-on-surface-variant pointer-events-none">
            设置
          </span>
          <Settings size={24} className="pointer-events-none shrink-0" />
        </button>
      </div>
    </header>
  );
};
