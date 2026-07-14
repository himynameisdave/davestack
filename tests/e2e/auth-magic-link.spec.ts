import { expect, test } from '@playwright/test';
import { createUser, extractLink, getLatestEmail } from './fixtures';

test('request a magic link from /login and use it to sign in', async ({ page }) => {
  const user = await createUser(); // verified, so magic-link sign-in is allowed

  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Email me a magic link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();

  const email = await getLatestEmail(page.request, user.email);
  expect(email.subject).toBe('Your sign-in link');

  // Visiting the link creates the session (callbackURL is /home) and lands us in.
  await page.goto(extractLink(email));
  await expect(page).toHaveURL(/\/home$/u);
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
});
