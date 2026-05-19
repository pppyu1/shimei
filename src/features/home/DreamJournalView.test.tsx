import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DreamJournalView } from './DreamJournalView';
import { createDreamEntry, persistDreamJournalStore } from '../../lib/dream-journal';

describe('DreamJournalView', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'obsidian';
  });

  it('loads existing dream entries and renders them on detail page', async () => {
    const entry = createDreamEntry({
      title: '旧梦回显',
      html: '<p>我看见一片海洋和门</p>',
      themes: ['lucid'],
      tags: ['海洋'],
      attachments: [],
      personalInterpretation: '像是在准备新的开始',
    });

    persistDreamJournalStore({
      entries: [entry],
      reminder: {
        enabled: false,
        time: '07:30',
        progressiveAlarm: true,
        guidanceVoice: true,
      },
      privacy: {
        encryptionEnabled: false,
        biometricUnlock: false,
        locked: false,
        decoyEnabled: false,
      },
    });

    render(<DreamJournalView user={null} onBack={() => {}} />);

    expect(screen.getByTestId('dream-journal-nightscape')).toBeInTheDocument();
    expect(await screen.findByText('旧梦回显')).toBeInTheDocument();
    expect(screen.getByText('像是在准备新的开始')).toBeInTheDocument();
  });

  it('fires back navigation from detail page', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<DreamJournalView user={null} onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: /返回首页/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('responds to app theme changes for the standalone scene', async () => {
    render(<DreamJournalView user={null} onBack={() => {}} />);

    const scene = screen.getByTestId('dream-journal-nightscape');
    expect(scene).toHaveAttribute('data-visual-theme', 'obsidian');

    document.documentElement.dataset.theme = 'dawn';

    await waitFor(() => {
      expect(scene).toHaveAttribute('data-visual-theme', 'dawn');
    });
  });
});
