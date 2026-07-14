import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Unit tests (Vitest). Colocated as src/**/*.test.ts. The e2e suite (Playwright)
// lives in tests/e2e and is configured separately. Expanded in the testing phase.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.{test,spec}.{js,ts}'],
      environment: 'jsdom',
      // Unit tests run in test mode so the email module selects its in-memory
      // capture transport (asserted by email/transport.test.ts). env.ts reads
      // process.env directly, so injecting here is enough — no .env.test load.
      env: { TEST_MODE: '1' },
    },
  }),
);
