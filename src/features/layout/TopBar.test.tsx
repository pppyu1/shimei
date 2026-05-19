import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('opens settings from pointer interaction', () => {
    const onOpenSettings = vi.fn();

    render(<TopBar onOpenMenu={vi.fn()} onOpenSettings={onOpenSettings} />);

    const button = screen.getByRole('button', { name: '打开设置' });
    fireEvent.pointerUp(button, { clientX: 10, clientY: 10 });

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('opens menu from keyboard click fallback', async () => {
    const user = userEvent.setup();
    const onOpenMenu = vi.fn();

    render(<TopBar onOpenMenu={onOpenMenu} onOpenSettings={vi.fn()} />);

    const button = screen.getByRole('button', { name: '打开菜单' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(onOpenMenu).toHaveBeenCalled();
  });
});
