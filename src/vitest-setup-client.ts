// Extends vitest's `expect` with jest-dom matchers (toHaveClass, toHaveAttribute, etc.)
// for component tests. Loaded via test.setupFiles in vitest.config.ts.
// oxlint-disable-next-line import/no-unassigned-import -- side-effect import, extends `expect` globally
import '@testing-library/jest-dom/vitest';
