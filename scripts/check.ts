#!/usr/bin/env bun
// svelte-check's CLI can report a thrown error and exit successfully. Treat that output as failure.
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
  // A signal-killed run (e.g. OOM) has a null exitCode — count it as a failure, not a pass.
  exitCode ||= run.success ? 0 : (run.exitCode ?? 1);
}
process.exit(exitCode);
