#!/usr/bin/env bun
/**
 * Runs `svelte-check` on tsgo (TS 7) and turns its swallowed failures into a non-zero exit.
 *
 * Why this exists: svelte-check's CLI wraps its whole run in a `try/catch` that only
 * `console.error`s the error plus the line `svelte-check failed` — it never sets an exit
 * code, so a thrown error (TS 7 alias missing, broken tsconfig, ...) exits 0 and CI goes
 * green while checking nothing. Verified on svelte-check@4.7.6; master still has it.
 * Remove this wrapper once upstream exits non-zero from that catch.
 *
 * Extra args are passed through (e.g. `bun scripts/check.ts --watch`).
 */
import { join } from 'node:path';

const FAILED = 'svelte-check failed';
const bin = join('node_modules', '.bin', 'svelte-check');
const extraArgs = process.argv.slice(2);
// The service worker is its own TS project (webworker types), so it gets a second
// pass. Skipped under --watch, where the first pass never exits.
const tsconfigs = extraArgs.includes('--watch')
  ? ['./tsconfig.json']
  : ['./tsconfig.json', './src/service-worker/tsconfig.json'];

let exitCode = 0;
for (const tsconfig of tsconfigs) {
  const run = Bun.spawnSync([bin, '--tsconfig', tsconfig, '--tsgo-experimental-api', ...extraArgs], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'pipe',
  });
  const stderr = run.stderr.toString();
  process.stderr.write(stderr);

  if (stderr.includes(FAILED)) {
    console.error(`\n✗ check: svelte-check threw (see above) — treating as failure.`);
    process.exit(1);
  }
  exitCode ||= run.exitCode;
}
process.exit(exitCode);
