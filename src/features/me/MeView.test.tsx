import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MeView } from './MeView';
import { featuredJourneys } from '../home/data';
import { defaultPreferences } from '../../lib/preferences';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe('MeView preferences module', () => {
  it('forwards preference interactions to shared handlers', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    const onCompactModeChange = vi.fn();
    const onReduceMotionChange = vi.fn();
    const onNotificationToggle = vi.fn();
    const onSecurityToggle = vi.fn();

    render(
      <MeView
        user={null}
        currentContent={featuredJourneys[0]}
        onOpenContent={vi.fn()}
        preferences={defaultPreferences}
        preferencesStatus=""
        onThemeChange={onThemeChange}
        onCompactModeChange={onCompactModeChange}
        onReduceMotionChange={onReduceMotionChange}
        onNotificationToggle={onNotificationToggle}
        onSecurityToggle={onSecurityToggle}
      />,
    );

    await user.click(screen.getAllByText('晨曦')[0]);
    await user.click(screen.getByText('紧凑布局'));
    await user.click(screen.getByText('邮件提醒'));
    await user.click(screen.getByText('敏感操作二次确认'));

    expect(onThemeChange).toHaveBeenCalledWith('dawn');
    expect(onCompactModeChange).toHaveBeenCalledWith(true);
    expect(onNotificationToggle).toHaveBeenCalledWith('emailAlerts', false);
    expect(onSecurityToggle).toHaveBeenCalledWith('confirmSensitiveActions', false);
  });
});
