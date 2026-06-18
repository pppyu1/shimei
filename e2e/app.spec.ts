import { test, expect } from '@playwright/test';

test.describe('Shimei App Core Flows', () => {
  test('should load the home page and show continue listening card', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 2, name: /好/ })).toBeVisible();
    await expect(page.getByRole('main').getByText('继续播放', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: '窗畔轻雨' })).toBeVisible();
  });

  test('should navigate between modules using BottomNav', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '自然' }).click();
    await expect(page.getByRole('heading', { name: '白噪音混音器' })).toBeVisible();

    await page.getByRole('button', { name: '禅定' }).click();
    await expect(page.getByText('准备')).toBeVisible();

    await page.getByRole('button', { name: '我的' }).click();
    await expect(page.getByText('账号与数据同步（Supabase）')).toBeVisible();
    await expect(page.getByText('设置与偏好')).toBeVisible();
  });

  test('should support hash routes and player deep links', async ({ page }) => {
    await page.goto('/#/nature');
    await expect(page.getByRole('heading', { name: '白噪音混音器' })).toBeVisible();

    await page.goto('/#/home/player/sleep-story-interstellar-v1');
    await expect(page.getByText('正在播放')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '窗畔轻雨' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sanctuary' })).toBeVisible();
  });

  test('should open player from home and show timer and offline actions', async ({ page }) => {
    await page.goto('/');

    const continueCard = page.locator('div.cursor-pointer').filter({ hasText: '继续播放' }).first();
    await continueCard.scrollIntoViewIfNeeded();
    await continueCard.click();

    await expect(page.getByText('正在播放')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '窗畔轻雨' })).toBeVisible();
    await expect(page.getByRole('button', { name: '15 分钟' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30 分钟' })).toBeVisible();
    await expect(page.getByText(/离线/)).toBeVisible();

    await page.getByRole('button', { name: '30 分钟' }).click();
    await expect(page.getByText('剩余 30:00')).toBeVisible();

    await page.getByRole('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click();
    await expect(page.getByRole('heading', { level: 2, name: /好/ })).toBeVisible();
  });

  test('should interact with the Nature mixer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '自然' }).click();

    const channelButton = page.locator('button').filter({ has: page.locator('svg.lucide-waves') }).first();
    await channelButton.click();

    const mixerPlayBtn = page.locator('button').filter({ has: page.locator('svg.lucide-play') }).last();
    await expect(mixerPlayBtn).toBeVisible();
    await mixerPlayBtn.click();
    await expect(page.getByText(/环境音/)).toBeVisible();
  });
});
