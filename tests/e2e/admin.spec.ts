import { expect, test } from '@playwright/test';
import { createUser, loginAs } from './fixtures';

test.describe('admin area', () => {
  test('404s for a non-admin user (existence is never revealed)', async ({ page }) => {
    const user = await createUser({ isAdmin: false });
    await loginAs(page, user);

    const response = await page.goto('/admin');
    expect(response?.status()).toBe(404);
  });

  test('renders the read-only dashboard for an admin user', async ({ page }) => {
    const admin = await createUser({ isAdmin: true });
    await loginAs(page, admin);

    const response = await page.goto('/admin');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    // The "Users" model-count stat card is always present.
    await expect(page.getByText('Users', { exact: true })).toBeVisible();
  });
});
