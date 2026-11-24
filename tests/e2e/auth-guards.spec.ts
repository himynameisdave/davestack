import { globSync } from 'node:fs';
import { dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { FEATURES } from './feature-map';
import { createUser, loginAs } from './fixtures';

const NO_REDIRECTS = { maxRedirects: 0 };

const SIGNED_OUT_STATUS = { public: 200, guest: 200, user: 303, admin: 404 };
const SIGNED_IN_STATUS = { guest: 303, user: 200, admin: 404 };

test('feature map matches every SvelteKit page', () => {
  const routesDir = fileURLToPath(new URL('../../src/routes/', import.meta.url));
  const pagePaths = globSync('**/+page.svelte', { cwd: routesDir }).map((file) => {
    const segments = dirname(file)
      .split(sep)
      .filter((segment) => segment !== '.' && !/^\([^)]+\)$/u.test(segment));
    return `/${segments.join('/')}`;
  });

  expect(
    FEATURES.map(({ path }) => path).toSorted(),
    'Update tests/e2e/feature-map.ts so every +page.svelte under src/routes has exactly one entry.',
  ).toEqual(pagePaths.toSorted());
});

for (const { path, access, what } of FEATURES) {
  test.describe(`${path} — ${what}`, () => {
    test('enforces access for a signed-out visitor', async ({ request }) => {
      const response = await request.get(path, NO_REDIRECTS);

      expect(response.status()).toBe(SIGNED_OUT_STATUS[access]);
      expect(response.headers().location).toBe(access === 'user' ? `/login?next=${encodeURIComponent(path)}` : undefined);
    });

    if (access !== 'public') {
      test('enforces access for a signed-in non-admin', async ({ page }) => {
        await loginAs(page, await createUser());
        const response = await page.request.get(path, NO_REDIRECTS);

        expect(response.status()).toBe(SIGNED_IN_STATUS[access]);
        expect(response.headers().location).toBe(access === 'guest' ? '/home' : undefined);
      });
    }

    if (access === 'admin') {
      test('serves a signed-in admin', async ({ page }) => {
        await loginAs(page, await createUser({ isAdmin: true }));
        const response = await page.request.get(path, NO_REDIRECTS);

        expect(response.status()).toBe(200);
      });
    }
  });
}
