import { expect, test } from '@playwright/test';

import { createUser, extractLink, getLatestEmail } from './fixtures';

test('signup validation preserves name and email and keeps the password out of the response', async ({ page }) => {
  const name = 'New User';
  const email = 'signup-validation@example.test';
  const password = 'abc!789';

  await page.goto('/signup');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  const [response] = await Promise.all([
    page.waitForResponse((result) => result.request().method() === 'POST' && result.url().endsWith('/signup')),
    page.getByRole('button', { name: 'Create account' }).click(),
  ]);

  expect(await response.text()).not.toContain(password);
  await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue(name);
  await expect(page.getByLabel('Email')).toHaveValue(email);
});

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

  const verifyEmail = await getLatestEmail(page.request, email);
  expect(verifyEmail.subject).toBe('Verify your email');
  await page.goto(extractLink(verifyEmail));

  // Verification leaves the browser signed out so this exercises password login.
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/home$/u);
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
});

test('password reset shows the same confirmation for registered and unregistered emails', async ({ page }) => {
  const user = await createUser();

  const requestReset = async (email: string) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();
    await expect(page.getByText('If an account exists for')).toBeVisible();
  };

  await requestReset(`unknown-${crypto.randomUUID()}@example.test`);
  await requestReset(user.email);

  const resetEmail = await getLatestEmail(page.request, user.email);
  await page.goto(extractLink(resetEmail));
  const password = 'new-password123';
  await page.getByLabel('New password').fill(password);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page).toHaveURL(/\/login\?reset=success$/u);

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/u);
});
