import { expect, test } from '@playwright/test';

import { createUser, loginAs } from './fixtures';

test('signs out from the user menu and returns to the marketing page', async ({ page }) => {
  const user = await createUser();
  await loginAs(page, user);

  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();

  await page.locator('header').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
});
