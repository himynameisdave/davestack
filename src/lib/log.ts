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
