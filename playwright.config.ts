import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load the committed test env FIRST so both this config and the webServer it
// spawns see the test DB (:5433), TEST_MODE, and the auth secret/URL.
dotenv.config({ path: '.env.test' });

const PORT = 4173;
const BASE_URL = process.env.BETTER_AUTH_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // workers: 1 — the test mailbox is a single in-memory array on the server and
  // all specs share one Postgres DB. A template favours deterministic, easy-to-
  // read runs over raw speed, so we execute serially rather than isolate per
  // worker. Bump this (and add per-worker DB isolation) only if the suite grows.
  workers: 1,
  reporter: process.env.CI ? [['html'], ['github']] : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      // Chromium only: the passkey specs drive a CDP WebAuthn *virtual
      // authenticator* (WebAuthn.addVirtualAuthenticator), which is a
      // Chrome DevTools Protocol feature — Firefox/WebKit have no equivalent.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // adapter-node build, then SvelteKit's `vite preview` SSR server on :4173.
    // Verified to serve the built app on 4173 (see the testing phase notes).
    command: 'bun run build && bun run preview',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Pass the test env explicitly. `...process.env` keeps PATH etc. for the
    // build; the named six guarantee the server boots against the test DB with
    // a BETTER_AUTH_URL that matches baseURL (passkey origin checks depend on it).
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? 'test',
      TEST_MODE: process.env.TEST_MODE ?? '1',
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL ?? '',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? '',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? BASE_URL,
    },
  },
});
