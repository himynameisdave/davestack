import { defineConfig } from 'oxlint';
import config from '@himynameisdave/oxlint-config';

export default defineConfig({
  extends: [config],
  rules: {
    // Conflicts with import/consistent-type-specifier-style prefer-inline (also from the shared
    // config): for an all-type import, one rule demands `import type { A }` and the other
    // `import { type A }`. Inline style wins here, so the top-level-demanding rule goes off.
    'typescript/no-import-type-side-effects': 'off',
    // Conflicts with vitest/valid-title (also from the shared config): one demands
    // `describe(fn, ...)`, the other rejects any non-string title. String titles win.
    'vitest/prefer-describe-function-title': 'off',
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
