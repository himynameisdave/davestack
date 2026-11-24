import config from '@himynameisdave/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [config],
  rules: {
    // Bundler define (__APP_VERSION__) and Prisma aggregate keys (_count, ...) use underscores.
    'eslint/no-underscore-dangle': [
      'error',
      {
        allow: ['__APP_VERSION__', '_count', '_avg', '_max', '_min', '_sum', '_all', 'as_'],
      },
    ],
    // Framework types that are inherently mutable, appended to the shared config's lib allowlist.
    'typescript/prefer-readonly-parameter-types': [
      'error',
      {
        ignoreInferredTypes: true,
        allow: [
          { from: 'lib', name: 'Date' },
          { from: 'lib', name: 'URL' },
          { from: 'lib', name: 'URLSearchParams' },
          { from: 'lib', name: 'FormData' },
          { from: 'lib', name: 'Request' },
          { from: 'lib', name: 'Response' },
          { from: 'lib', name: 'Headers' },
          { from: 'lib', name: 'RegExp' },
          'RequestEvent',
          'Page',
          'APIRequestContext',
        ],
      },
    ],
  },
  overrides: [
    {
      // App code reads validated env and uses Svelte runes for reactive state.
      files: ['src/**'],
      rules: {
        'eslint/no-restricted-properties': [
          'error',
          {
            object: 'process',
            property: 'env',
            message: 'Declare the variable in src/lib/server/env.ts and import env from #lib/server/env.js.',
          },
        ],
        'eslint/no-restricted-imports': [
          'error',
          { name: 'svelte/store', message: 'Use $state in a .svelte.ts module for shared reactive state.' },
        ],
        'eslint/no-restricted-globals': [
          'error',
          {
            name: '$effect',
            message:
              'Use $derived for computed state or an event handler for side effects. If an effect is essential, add a file-specific override in oxlint.config.ts.',
          },
        ],
      },
    },
    {
      // The env schema is the single entry point for raw environment variables in app code.
      files: ['src/lib/server/env.ts'],
      rules: { 'eslint/no-restricted-properties': 'off' },
    },
    {
      // Keep the admin dashboard read-only. Other pages can still export form actions.
      files: ['src/routes/(admin)/admin/+page.server.ts'],
      rules: { 'eslint/no-restricted-exports': ['error', { restrictedNamedExports: ['actions'] }] },
    },
    {
      // CLI entry points (setup wizard, git hooks, DB seed): console IS their user interface and
      // process.exit their exit-status contract, exactly like a shell script.
      files: ['scripts/**', 'prisma/seed.ts'],
      rules: {
        'eslint/no-console': 'off',
        'unicorn/no-process-exit': 'off',
      },
    },
    {
      // Playwright specs, not Vitest suites — test/expect come from '@playwright/test', but the
      // vitest plugin resolves them as globals and demands vitest imports that would break at runtime.
      files: ['tests/e2e/**'],
      rules: {
        'vitest/prefer-importing-vitest-globals': 'off',
      },
    },
  ],
  // Generated Prisma client on top of the shared config's build-artifact ignores.
  ignorePatterns: ['generated/**', 'src/generated/**'],
});
