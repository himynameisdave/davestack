import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load the test environment before deriving settings for the runner and preview server.
dotenv.config({ path: '.env.test' });

// The test DB is always disposable: `bun run test:e2e` (scripts/test-e2e.ts)
// starts a throwaway Postgres container and injects DATABASE_URL; CI injects its
// postgres service. Fail fast (before the webServer builds) when invoked any
// other way, so global setup's schema push + table wipe can't hit a real DB.
if (!process.env.CI && process.env.E2E_EPHEMERAL_DB !== '1') {
  throw new Error(
    'Run e2e via `bun run test:e2e` (or `bun run test:e2e:ui`), not `playwright test` directly: '
      + 'the wrapper starts and tears down the throwaway test database.',
  );
}

const PORT = 4173;
const BASE_URL = process.env.BETTER_AUTH_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Workers share one database and one in-memory mailbox.
  workers: 1,
  reporter: process.env.CI ? [['html'], ['github']] : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      // The passkey specs use Chromium's CDP virtual authenticator.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run build && bun run preview',
    port: PORT,
    // Never reuse: every run gets a new throwaway DB, and a server left over from
    // an earlier run would still point at that run's (now deleted) database.
    reuseExistingServer: false,
    timeout: 180_000,
    // The preview server needs the same database and WebAuthn origin as the runner.
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
