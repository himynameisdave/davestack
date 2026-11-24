import { expect, test } from '@playwright/test';

import { createUser, loginAs, withVirtualAuthenticator } from './fixtures';

test.describe('passkeys', () => {
  test('register a passkey, sign out, then sign in with it', async ({ page }) => {
    const authenticator = await withVirtualAuthenticator(page);
    const user = await createUser();
    await loginAs(page, user);

    await page.goto('/account');
    await page.getByLabel('New passkey name').fill('My Test Key');
    await page.getByRole('button', { name: 'Add passkey' }).click();

    await expect(page.getByText('My Test Key')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();

    await page.locator('header').getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/');

    // Conditional autofill can finish before the click and detach the sign-in button.
    await page.goto('/login');
    await page
      .getByRole('button', { name: 'Sign in with a passkey' })
      .click({ timeout: 5000 })
      .catch(() => {
        // Button detached because the autofill ceremony already navigated — a pass.
      });
    await expect(page).toHaveURL(/\/home$/u);
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();

    await authenticator.cleanup();
  });

  test('a revoked passkey can no longer sign in', async ({ page }) => {
    const authenticator = await withVirtualAuthenticator(page);
    const user = await createUser();
    await loginAs(page, user);

    await page.goto('/account');
    await page.getByLabel('New passkey name').fill('Doomed Key');
    await page.getByRole('button', { name: 'Add passkey' }).click();
    await expect(page.getByText('Doomed Key')).toBeVisible();

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('No passkeys yet. Add one above.')).toBeVisible();

    await page.locator('header').getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in with a passkey' }).click();

    await expect(page.locator('p.text-destructive').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/u);

    await authenticator.cleanup();
  });
});
