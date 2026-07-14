import { expect, test } from '@playwright/test';
import { createUser, loginAs } from './fixtures';

test.describe('auth guards', () => {
  test('redirects an unauthenticated visitor from an app route to /login', async ({ page }) => {
    await page.goto('/home');

    // The (app) layout guard bounces to /login and preserves the destination.
    await expect(page).toHaveURL(/\/login\?next=/u);
    expect(page.url()).toContain('next=%2Fhome');
  });

  test('signs out from the user menu and returns to the marketing page', async ({ page }) => {
    const user = await createUser();
    await loginAs(page, user);

    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();

    // The header has exactly one button: the account dropdown trigger.
    await page.locator('header').getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });
});
