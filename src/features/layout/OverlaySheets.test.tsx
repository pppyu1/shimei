import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MenuSheet, SettingsSheet } from './OverlaySheets';
import { defaultPreferences } from '../../lib/preferences';

describe('OverlaySheets', () => {
  it('closes the settings sheet from the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SettingsSheet
        isOpen
        onClose={onClose}
        preferences={defaultPreferences}
        status=""
        onThemeChange={vi.fn()}
        onCompactModeChange={vi.fn()}
        onReduceMotionChange={vi.fn()}
        onNotificationToggle={vi.fn()}
        onSecurityToggle={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers settings callbacks from settings sheet', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    const onCompactModeChange = vi.fn();
    const onReduceMotionChange = vi.fn();
    const onNotificationToggle = vi.fn();
    const onSecurityToggle = vi.fn();

    render(
      <SettingsSheet
        isOpen
        onClose={vi.fn()}
        preferences={defaultPreferences}
        status=""
        onThemeChange={onThemeChange}
        onCompactModeChange={onCompactModeChange}
        onReduceMotionChange={onReduceMotionChange}
        onNotificationToggle={onNotificationToggle}
        onSecurityToggle={onSecurityToggle}
      />,
    );

    await user.click(screen.getByText('晨曦'));
    await user.click(screen.getByText('紧凑布局'));
    await user.click(screen.getByText('睡前提醒'));
    await user.click(screen.getByText('记住登录状态'));

    expect(onThemeChange).toHaveBeenCalledWith('dawn');
    expect(onCompactModeChange).toHaveBeenCalledWith(true);
    expect(onNotificationToggle).toHaveBeenCalledWith('bedtimeReminder', false);
    expect(onSecurityToggle).toHaveBeenCalledWith('rememberSession', false);
  });

  it('triggers navigation and quick actions from menu sheet', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onOpenPlayer = vi.fn();

    render(
      <MenuSheet
        isOpen
        onClose={vi.fn()}
        activeView="home"
        onNavigate={onNavigate}
        onOpenPlayer={onOpenPlayer}
        canAccessAdmin
        currentContentTitle="窗畔轻雨"
        preferenceHistory={[{ id: '1', label: '主题模式', value: '曜夜', at: new Date().toISOString() }]}
        user={null}
      />,
    );

    await user.click(screen.getByText('管理后台'));
    await user.click(screen.getByText('继续播放'));

    expect(onNavigate).toHaveBeenCalledWith('admin');
    expect(onOpenPlayer).toHaveBeenCalled();
    expect(screen.getByText('主题模式')).toBeInTheDocument();
  });
});
