import type { User } from '@supabase/supabase-js';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeView } from './HomeView';
import { featuredJourneys } from './data';
import { fetchProfile } from '../../lib/api';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    fetchProfile: vi.fn(),
  };
});

const mockedFetchProfile = vi.mocked(fetchProfile);

const createUser = (overrides: Partial<User> = {}) =>
  ({
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as User;

const renderHomeView = (user: User | null = null) =>
  render(
    <HomeView
      user={user}
      currentContent={featuredJourneys[0]}
      playbackSnapshot={{ currentTime: 0, duration: 0 }}
      isPlaying={false}
      onResumePlayer={() => {}}
      onSelectContent={() => {}}
      onOpenDreamJournal={() => {}}
    />,
  );

describe('HomeView intent module', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedFetchProfile.mockReset();
    mockedFetchProfile.mockResolvedValue(null);
  });

  it('persists selected intent and updates journey order in real time', async () => {
    const user = userEvent.setup();

    renderHomeView();

    await user.click(screen.getByRole('button', { name: '深度睡眠' }));

    expect(screen.getByText('当前意图：深度睡眠')).toBeInTheDocument();
    expect(screen.getByText('已切换为「深度睡眠」')).toBeInTheDocument();

    const journeySection = screen.getByText('精选旅程').closest('section');
    expect(journeySection).not.toBeNull();
    const headings = within(journeySection as HTMLElement).getAllByRole('heading', { level: 5 });
    expect(headings[0]).toHaveTextContent('深海潮声');
    expect(window.localStorage.getItem('shimei:home-intent')).toContain('"selectedIntent":"sleep"');
  });

  it('renders dream journal entry card and handles navigation click', async () => {
    const user = userEvent.setup();
    const onOpenDreamJournal = vi.fn();

    render(
      <HomeView
        user={null}
        currentContent={featuredJourneys[0]}
        playbackSnapshot={{ currentTime: 0, duration: 0 }}
        isPlaying={false}
        onResumePlayer={() => {}}
        onSelectContent={() => {}}
        onOpenDreamJournal={onOpenDreamJournal}
      />,
    );

    expect(screen.getByText('晨间梦境记录')).toBeInTheDocument();
    expect(screen.getByText(/进入独立页面记录与回看梦境/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /晨间梦境记录/ }));
    expect(onOpenDreamJournal).toHaveBeenCalledTimes(1);
  });

  it('shows a time-based greeting without user name when signed out', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:15:00'));

    renderHomeView();

    expect(screen.getByRole('heading', { level: 2, name: '中午好' })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('uses the signed-in profile name in the greeting', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T15:20:00'));
    mockedFetchProfile.mockResolvedValue({ display_name: 'Elena' });

    renderHomeView(
      createUser({
        email: 'fallback@example.com',
        user_metadata: { full_name: 'Metadata Name' },
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { level: 2, name: '下午好，Elena' })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('refreshes the greeting when the time segment changes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T11:59:30'));

    renderHomeView();
    expect(screen.getByRole('heading', { level: 2, name: '早上好' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });

    expect(screen.getByRole('heading', { level: 2, name: '中午好' })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('switches between anonymous and signed-in greeting as auth state changes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T20:10:00'));
    mockedFetchProfile.mockResolvedValue({ display_name: 'Nora' });

    const { rerender } = renderHomeView();
    expect(screen.getByRole('heading', { level: 2, name: '晚上好' })).toBeInTheDocument();

    rerender(
      <HomeView
        user={createUser({ id: 'user-2', email: 'nora@example.com' })}
        currentContent={featuredJourneys[0]}
        playbackSnapshot={{ currentTime: 0, duration: 0 }}
        isPlaying={false}
        onResumePlayer={() => {}}
        onSelectContent={() => {}}
        onOpenDreamJournal={() => {}}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { level: 2, name: '晚上好，Nora' })).toBeInTheDocument();

    vi.useRealTimers();
  });
});
