import { expect, test } from '@playwright/test';

import { createUser, loginAs } from './fixtures';

test.describe('admin area', () => {
  test('renders the read-only dashboard for an admin user', async ({ page }) => {
    const admin = await createUser({ isAdmin: true });
    await loginAs(page, admin);

    const response = await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByText('Users', { exact: true })).toBeVisible();
    const gitSha = process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown';
    await expect(page.getByRole('definition').filter({ hasText: gitSha })).toHaveText(gitSha);

    const database = new URL(process.env.DATABASE_URL ?? '');
    await expect(page.getByText(database.host, { exact: true })).toBeVisible();
    const html = await response?.text();
    expect(html?.includes(database.href)).toBe(false);
  });
});
