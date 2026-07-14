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
    },
  }),
);
