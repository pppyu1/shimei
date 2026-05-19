import React from 'react';
import { Bell, ChevronRight, History, LayoutGrid, LockKeyhole, Moon, PlayCircle, Shield, Sparkles, UserRound, Wind, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { MainView } from '../shared/types';
import type { AppPreferences, AppTheme, PreferenceHistoryEntry } from '../../lib/preferences';

const SheetFrame = ({
  isOpen,
  side,
  title,
  subtitle,
  onClose,
  children,
}: {
  isOpen: boolean;
  side: 'left' | 'right';
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const handleClose = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[70] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        onClick={(event) => event.stopPropagation()}
        className={`absolute top-0 ${side === 'left' ? 'left-0 border-r' : 'right-0 border-l'} h-full w-full max-w-md bg-surface border-outline-variant/10 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="relative px-5 py-5 pr-22 border-b border-outline-variant/10">
            <div className="min-w-0 pointer-events-none select-none">
              <h3 className="font-headline text-2xl text-on-surface">{title}</h3>
              <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>
            </div>
            <button
              onClick={handleClose}
              style={{ touchAction: 'manipulation' }}
              className="absolute right-5 top-1/2 z-20 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl text-on-surface-variant bg-surface-container-low/85 border border-outline-variant/10 hover:bg-surface-container-high active:scale-[0.98] leading-none shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
              aria-label="关闭"
              type="button"
            >
              <X size={18} className="pointer-events-none shrink-0" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 custom-scrollbar">{children}</div>
        </div>
      </aside>
    </div>
  );
};

export const MenuSheet = ({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  onOpenPlayer,
  canAccessAdmin,
  currentContentTitle,
  preferenceHistory,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeView: MainView;
  onNavigate: (view: MainView) => void;
  onOpenPlayer: () => void;
  canAccessAdmin: boolean;
  currentContentTitle: string;
  preferenceHistory: PreferenceHistoryEntry[];
  user: User | null;
}) => {
  const navItems: { id: MainView; label: string; icon: typeof Moon; desc: string }[] = [
    { id: 'home', label: '首页', icon: Moon, desc: '晚间概览与晨间记录' },
    { id: 'nature', label: '自然', icon: Wind, desc: '白噪音与环境混音' },
    { id: 'zen', label: '禅定', icon: Sparkles, desc: '呼吸节律与专注练习' },
    { id: 'me', label: '我的', icon: UserRound, desc: '账户、收藏与偏好' },
  ];

  const quickActions = [
    { label: '继续播放', desc: currentContentTitle, icon: PlayCircle, onClick: onOpenPlayer },
    { label: '晨间记录', desc: '快速进入首页记录梦境', icon: LayoutGrid, onClick: () => onNavigate('home') },
    { label: '最近播放', desc: '查看收听历史与当前内容', icon: History, onClick: () => onNavigate('me') },
  ];

  return (
    <SheetFrame isOpen={isOpen} side="left" title="导航菜单" subtitle={user?.email ?? '切换主要功能、快捷操作与最近记录'} onClose={onClose}>
      <section className="space-y-3">
        <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant">主要功能</p>
        <div className="space-y-2">
          {navItems.concat(canAccessAdmin ? [{ id: 'admin' as MainView, label: '管理后台', icon: Shield as typeof Moon, desc: '查看日志与管理入口' }] : []).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full rounded-2xl p-4 text-left border transition-colors ${
                  active ? 'border-primary/30 bg-primary/10' : 'border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={18} className={active ? 'text-primary' : 'text-secondary'} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                      <p className="text-xs text-on-surface-variant truncate">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-on-surface-variant/50" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant">快捷操作</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} onClick={action.onClick} className="rounded-2xl p-4 bg-surface-container-low text-left border border-outline-variant/10 hover:bg-surface-container-high transition-colors">
                <Icon size={18} className="text-primary mb-3" />
                <p className="text-sm font-semibold text-on-surface">{action.label}</p>
                <p className="text-xs text-on-surface-variant mt-1">{action.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant">最近设置</p>
        <div className="space-y-2">
          {preferenceHistory.length ? (
            preferenceHistory.map((entry) => (
              <div key={entry.id} className="rounded-2xl p-4 bg-surface-container-low border border-outline-variant/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-on-surface">{entry.label}</p>
                  <span className="text-[10px] font-label uppercase tracking-widest text-primary">{entry.value}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-2">{new Date(entry.at).toLocaleString('zh-CN')}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">你最近的设置变更会显示在这里，方便快速回看。</p>
          )}
        </div>
      </section>
    </SheetFrame>
  );
};

const ThemeOption = ({
  label,
  desc,
  value,
  current,
  onSelect,
}: {
  label: string;
  desc: string;
  value: AppTheme;
  current: AppTheme;
  onSelect: (value: AppTheme) => void;
}) => (
  <button
    onClick={() => onSelect(value)}
    className={`rounded-2xl border p-4 text-left transition-colors ${
      current === value ? 'border-primary/30 bg-primary/10' : 'border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high'
    }`}
  >
    <p className="text-sm font-semibold text-on-surface">{label}</p>
    <p className="text-xs text-on-surface-variant mt-1">{desc}</p>
  </button>
);

const ToggleRow = ({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button onClick={() => onChange(!checked)} className="w-full rounded-2xl p-4 bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container-high transition-colors text-left">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <Icon size={18} className={checked ? 'text-primary' : 'text-secondary'} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface">{label}</p>
          <p className="text-xs text-on-surface-variant mt-1">{desc}</p>
        </div>
      </div>
      <span className={`mt-1 inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary/80' : 'bg-outline-variant/50'}`}>
        <span className={`h-5 w-5 rounded-full bg-white mt-0.5 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </div>
  </button>
);

export const SettingsSheet = ({
  isOpen,
  onClose,
  preferences,
  status,
  onThemeChange,
  onCompactModeChange,
  onReduceMotionChange,
  onNotificationToggle,
  onSecurityToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  preferences: AppPreferences;
  status: string;
  onThemeChange: (theme: AppTheme) => void;
  onCompactModeChange: (value: boolean) => void;
  onReduceMotionChange: (value: boolean) => void;
  onNotificationToggle: (key: keyof AppPreferences['notifications'], value: boolean) => void;
  onSecurityToggle: (key: keyof AppPreferences['security'], value: boolean) => void;
}) => (
  <SheetFrame isOpen={isOpen} side="right" title="设置中心" subtitle="主题、通知与账号安全会实时生效并自动保存" onClose={onClose}>
    <section className="space-y-3">
      <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant">主题与显示</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ThemeOption label="曜夜" desc="保持沉浸暗色氛围" value="obsidian" current={preferences.theme} onSelect={onThemeChange} />
        <ThemeOption label="晨曦" desc="更明亮、适合白天浏览" value="dawn" current={preferences.theme} onSelect={onThemeChange} />
        <ThemeOption label="跟随系统" desc="根据设备深浅色切换" value="system" current={preferences.theme} onSelect={onThemeChange} />
      </div>
      <div className="space-y-2">
        <ToggleRow icon={LayoutGrid} label="紧凑布局" desc="在小屏设备上显示更紧凑的信息密度" checked={preferences.compactMode} onChange={onCompactModeChange} />
        <ToggleRow icon={Sparkles} label="减少动态效果" desc="降低过渡和动效强度，提升舒适度" checked={preferences.reduceMotion} onChange={onReduceMotionChange} />
      </div>
    </section>

    <section className="space-y-3">
      <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant">通知设置</p>
      <div className="space-y-2">
        <ToggleRow icon={Bell} label="睡前提醒" desc="晚间定时提醒进入放松模式" checked={preferences.notifications.bedtimeReminder} onChange={(value) => onNotificationToggle('bedtimeReminder', value)} />
        <ToggleRow icon={History} label="每周睡眠回顾" desc="汇总一周内的播放与练习记录" checked={preferences.notifications.weeklyDigest} onChange={(value) => onNotificationToggle('weeklyDigest', value)} />
        <ToggleRow icon={Sparkles} label="功能更新通知" desc="在新内容和功能上线时提醒你" checked={preferences.notifications.productUpdates} onChange={(value) => onNotificationToggle('productUpdates', value)} />
        <ToggleRow icon={Bell} label="邮件提醒" desc="允许通过邮件接收登录与回顾提醒" checked={preferences.notifications.emailAlerts} onChange={(value) => onNotificationToggle('emailAlerts', value)} />
      </div>
    </section>

    <section className="space-y-3">
      <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant">账号安全</p>
      <div className="space-y-2">
        <ToggleRow icon={LockKeyhole} label="记住登录状态" desc="在当前设备上保持会话，减少重复登录" checked={preferences.security.rememberSession} onChange={(value) => onSecurityToggle('rememberSession', value)} />
        <ToggleRow icon={Shield} label="敏感操作二次确认" desc="删除记录、退出登录等操作前再次确认" checked={preferences.security.confirmSensitiveActions} onChange={(value) => onSecurityToggle('confirmSensitiveActions', value)} />
        <ToggleRow icon={Shield} label="生物识别提示" desc="为后续接入 Face ID / 指纹锁预留偏好位" checked={preferences.security.biometricLock} onChange={(value) => onSecurityToggle('biometricLock', value)} />
      </div>
    </section>

    {status && <p className="text-xs text-on-surface-variant rounded-2xl px-4 py-3 bg-surface-container-low border border-outline-variant/10">{status}</p>}
  </SheetFrame>
);
