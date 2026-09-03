import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

// Unit tests (Vitest). Colocated as src/**/*.test.ts. The e2e suite (Playwright)
// lives in tests/e2e and is configured separately. Expanded in the testing phase.
//
// Split into two projects because SvelteKit's vite plugin picks the server-side
// Svelte runtime unless `resolve.conditions` includes 'browser' — component tests
// need that (and a DOM), plain logic tests don't and must keep node's conditions
// (server-only imports like $env/dynamic/private, nodemailer, etc. depend on it).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Unit tests run in test mode so the email module selects its in-memory
      // capture transport (asserted by email/transport.test.ts). env.ts reads
      // process.env directly, so injecting here is enough — no .env.test load.
      env: { TEST_MODE: '1' },
      projects: [
        {
          extends: true,
          test: {
            name: 'server',
            environment: 'node',
            include: ['src/**/*.{test,spec}.{js,ts}'],
            exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          },
        },
        {
          extends: true,
          resolve: { conditions: ['browser'] },
          test: {
            name: 'client',
            environment: 'happy-dom',
            include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
            setupFiles: ['./src/vitest-setup-client.ts'],
          },
        },
      ],
    },
  }),
);
