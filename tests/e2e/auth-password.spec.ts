import { expect, test } from '@playwright/test';

import { extractLink, getLatestEmail } from './fixtures';

test('signup → verify email → password login → /home', async ({ page }) => {
  const email = `signup-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const password = 'password123';
  await page.addInitScript(() => {
    const events: { event: string; data: unknown }[] = [];
    globalThis.umami = {
      track(event, data) {
        events.push({ event, data });
        sessionStorage.setItem('signup-events', JSON.stringify(events));
      },
    };
  });

  // 1. Sign up. requireEmailVerification is on, so this does NOT log us in — it
  //    creates an unverified account and sends a verification email.
  await page.goto('/signup');
  await page.getByLabel('Name').fill('New User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('signup-events'))).toBeNull();

  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Verify your email')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('signup-events')))
    .toBe(JSON.stringify([{ event: 'signup_completed', data: { method: 'password' } }]));

  // 2. Read the verification link from the mailbox and visit it.
  const verifyEmail = await getLatestEmail(page.request, email);
  expect(verifyEmail.subject).toBe('Verify your email');
  await page.goto(extractLink(verifyEmail));

  // 3. Now log in with the password (autoSignInAfterVerification is off).
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/home$/u);
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
});
