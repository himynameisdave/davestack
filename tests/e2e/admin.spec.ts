import { expect, test } from '@playwright/test';

import { createUser, loginAs } from './fixtures';

test.describe('admin area', () => {
  test('renders the read-only dashboard for an admin user', async ({ page }) => {
    const admin = await createUser({ isAdmin: true });
    await loginAs(page, admin);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    // The "Users" model-count stat card is always present.
    await expect(page.getByText('Users', { exact: true })).toBeVisible();
    const gitSha = process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown';
    await expect(page.getByRole('definition').filter({ hasText: gitSha })).toHaveText(gitSha);
  });
});
