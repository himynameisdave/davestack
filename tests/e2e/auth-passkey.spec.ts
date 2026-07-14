import { expect, test } from '@playwright/test';
import { createUser, loginAs, withVirtualAuthenticator } from './fixtures';

// These specs drive a real WebAuthn ceremony through a CDP virtual authenticator
// (see withVirtualAuthenticator). No navigator.credentials mocking — the browser
// performs a genuine create()/get() against a simulated platform authenticator.

test.describe('passkeys', () => {
  test('register a passkey, sign out, then sign in with it', async ({ page }) => {
    const authenticator = await withVirtualAuthenticator(page);
    const user = await createUser();
    await loginAs(page, user);

    // Register a passkey from the account page.
    await page.goto('/account');
    await page.getByLabel('New passkey name').fill('My Test Key');
    await page.getByRole('button', { name: 'Add passkey' }).click();

    // It shows up in the list with a Remove control.
    await expect(page.getByText('My Test Key')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();

    // Sign out (header dropdown → Sign out).
    await page.locator('header').getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/');

    // Sign back in with the passkey — the virtual authenticator still holds the
    // discoverable credential, so the usernameless ceremony succeeds.
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
    await expect(page).toHaveURL(/\/home$/u);
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();

    await authenticator.cleanup();
  });

  test('a revoked passkey can no longer sign in', async ({ page }) => {
    const authenticator = await withVirtualAuthenticator(page);
    const user = await createUser();
    await loginAs(page, user);

    // Register, then revoke, the passkey.
    await page.goto('/account');
    await page.getByLabel('New passkey name').fill('Doomed Key');
    await page.getByRole('button', { name: 'Add passkey' }).click();
    await expect(page.getByText('Doomed Key')).toBeVisible();

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('No passkeys yet. Add one above.')).toBeVisible();

    // Sign out.
    await page.locator('header').getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/');

    // The authenticator still has the credential, but the server deleted the
    // Passkey row — so the assertion is rejected and we never leave /login.
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in with a passkey' }).click();

    await expect(page.locator('p.text-destructive').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/u);

    await authenticator.cleanup();
  });
});
