import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

// SvelteKit resolves Svelte to its server runtime by default. Component tests need the browser runtime.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Select in-memory email delivery for transport tests.
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
