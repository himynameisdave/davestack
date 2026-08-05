// The single sanctioned console seam for app code. This is NOT server-only —
// it must be importable from both server code and browser code (e.g.
// `$lib/client/passkey-auth.svelte.ts` runs in the browser), so it imports
// nothing server-only.
//
// App code (everything under `src/**`) logs through `logger`, never through
// `console.*` directly, so `eslint/no-console` can stay an error repo-wide
// without scattering `oxlint-disable-next-line` comments across call sites.
// `scripts/**` and `prisma/seed.ts` are CLI programs where console IS the
// interface — they're exempted via the `oxlint.config.ts` override instead.

/* oxlint-disable eslint/no-console -- this module is the one sanctioned console seam for app code */
export const logger = {
  info: (...args: readonly unknown[]): void => {
    console.log(...args);
  },
  error: (...args: readonly unknown[]): void => {
    console.error(...args);
  },
};
/* oxlint-enable eslint/no-console */
