import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DreamJournalModule } from './DreamJournalModule';

describe('DreamJournalModule', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
    });
  });

  it('creates timeline entries and allows searching', async () => {
    const user = userEvent.setup();

    render(<DreamJournalModule user={null} confirmSensitiveActions={false} />);

    await user.type(screen.getByPlaceholderText('梦境标题，例如：在雾海上飞行'), '飞行梦');
    fireEvent.input(screen.getByTestId('dream-editor'), {
      target: { innerHTML: '<p>我在海洋上飞行</p>', textContent: '我在海洋上飞行' },
    });
    const editor = screen.getByTestId('dream-editor');
    editor.innerHTML = '<p>我在海洋上飞行</p>';
    editor.textContent = '我在海洋上飞行';

    await user.click(screen.getByRole('button', { name: '清醒梦' }));
    await user.type(screen.getByPlaceholderText('输入自定义标签后回车，例如：飞行、海浪、祖母'), '海洋');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: '保存梦境' }));

    expect(await screen.findByText('梦境记录已保存。')).toBeInTheDocument();
    expect(screen.getByText('飞行梦')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('搜索标题、正文、标签、个人解析');
    await user.type(searchInput, '海洋');
    expect(screen.getByText('飞行梦')).toBeInTheDocument();
  });

  it('does not render the privacy and unlock panel', () => {
    render(<DreamJournalModule user={null} confirmSensitiveActions={false} />);

    expect(screen.queryByRole('heading', { name: '隐私与解锁' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /解锁梦境保险箱/i })).not.toBeInTheDocument();
  });

  it('updates reminder settings in real time', async () => {
    const user = userEvent.setup();
    render(<DreamJournalModule user={null} confirmSensitiveActions={false} />);

    await user.click(screen.getByText('每日晨间提醒'));
    const timeInput = screen.getByDisplayValue('07:30');
    await user.clear(timeInput);
    await user.type(timeInput, '0830');

    await waitFor(() => {
      const stored = window.localStorage.getItem('shimei:dream-journal');
      expect(stored).toContain('"enabled":true');
      expect(stored).toContain('"time":"08:30"');
    });
  });

  it('applies bold, italic and list formatting inside the editor', async () => {
    const user = userEvent.setup();
    render(<DreamJournalModule user={null} confirmSensitiveActions={false} />);

    const editor = screen.getByTestId('dream-editor');
    editor.innerHTML = '<p>第一段文字</p><p>第二段文字</p>';
    let activeRange: Range | null = null;
    const selectionMock = {
      rangeCount: 1,
      getRangeAt: () => activeRange!,
      removeAllRanges: () => {
        activeRange = null;
      },
      addRange: (range: Range) => {
        activeRange = range;
      },
    };
    vi.spyOn(window, 'getSelection').mockImplementation(() => selectionMock as unknown as Selection);

    const firstText = editor.querySelector('p')?.firstChild;
    expect(firstText).not.toBeNull();
    const range = document.createRange();
    range.setStart(firstText!, 0);
    range.setEnd(firstText!, 4);
    activeRange = range;
    fireEvent.mouseUp(editor);

    await user.click(screen.getByRole('button', { name: '加粗' }));
    expect(editor.innerHTML).toContain('<strong>第一段文</strong>');

    const boldText = editor.querySelector('strong')?.firstChild;
    expect(boldText).not.toBeNull();
    const italicRange = document.createRange();
    italicRange.setStart(boldText!, 0);
    italicRange.setEnd(boldText!, 4);
    activeRange = italicRange;
    fireEvent.mouseUp(editor);

    await user.click(screen.getByRole('button', { name: '斜体' }));
    expect(editor.innerHTML).toContain('<em>');

    editor.innerHTML = '项目一\n项目二';
    const listText = editor.firstChild;
    const listRange = document.createRange();
    listRange.setStart(listText!, 0);
    listRange.setEnd(listText!, editor.textContent?.length ?? 0);
    activeRange = listRange;
    fireEvent.mouseUp(editor);

    await user.click(screen.getByRole('button', { name: '列表' }));
    expect(editor.querySelectorAll('ul li')).toHaveLength(2);
  });
});
