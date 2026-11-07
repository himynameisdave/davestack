#!/usr/bin/env bun
/**
 * `bun run test:e2e` entry point. Runs Playwright against a throwaway Postgres.
 *
 * Locally: start a fresh `postgres:17` container on a random host port, with its data dir on
 * tmpfs, run Playwright against it, then `docker rm -f` it no matter how the run ends. Every run
 * gets an empty database, so global setup only needs a plain `prisma db push`. It never needs
 * `--force-reset`, which Prisma refuses to run for an AI agent without a human's explicit consent.
 *
 * In CI (`CI` set): run Playwright directly. The workflow's `postgres` service container is
 * already fresh per job, so there's nothing to spin up.
 *
 * Extra args are passed through (e.g. `bun scripts/test-e2e.ts --ui`, `-g passkey`).
 */

import { join } from 'node:path';

const POSTGRES_IMAGE = 'postgres:17';
const DB_USER = 'davestack';
const DB_PASSWORD = 'davestack';
const DB_NAME = 'davestack_test';
// Every container this script starts carries this label + the owning script's PID, so a run
// that died before its cleanup (SIGKILL, closed terminal) gets swept by the next one.
const LABEL = 'davestack.e2e';
const READY_TIMEOUT_MS = 60_000;

const playwrightArgs = process.argv.slice(2);

// Spawn the bin directly (not via bunx) so a forwarded signal lands on Playwright itself.
const PLAYWRIGHT_BIN = join('node_modules', '.bin', 'playwright');
let child: { kill: (signal: NodeJS.Signals) => void } | undefined;

const playwright = async (env: Readonly<Record<string, string | undefined>>): Promise<number> => {
  const proc = Bun.spawn([PLAYWRIGHT_BIN, 'test', ...playwrightArgs], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env,
  });
  child = proc;
  return proc.exited;
};

if (process.env.CI) {
  process.exit(await playwright(process.env));
}

const docker = (...args: readonly string[]) =>
  Bun.spawnSync(['docker', ...args], { stdout: 'pipe', stderr: 'pipe' });

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

if (docker('info').exitCode !== 0) {
  console.error('✗ test:e2e: Docker is not running. Local e2e starts a throwaway Postgres container.');
  process.exit(1);
}

// Sweep containers orphaned by earlier runs whose owning process is gone.
const orphans = docker(
  'ps',
  '-a',
  '--filter',
  `label=${LABEL}`,
  '--format',
  `{{.ID}} {{.Label "${LABEL}.pid"}}`,
)
  .stdout.toString()
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split(' '))
  .filter(([, pid]) => !isAlive(Number(pid)))
  .map(([id]) => id);
if (orphans.length > 0) {
  docker('rm', '-f', ...orphans);
}

const container = `davestack-e2e-${process.pid}-${Date.now().toString(36)}`;
const started = docker(
  'run',
  '--detach',
  '--rm',
  '--name',
  container,
  '--label',
  LABEL,
  '--label',
  `${LABEL}.pid=${process.pid}`,
  // Let Docker pick a free host port, so parallel runs (or several davestack apps) never collide.
  '--publish',
  '127.0.0.1::5432',
  // RAM-backed data dir: faster, and nothing survives the container.
  '--tmpfs',
  '/var/lib/postgresql/data',
  '--env',
  `POSTGRES_USER=${DB_USER}`,
  '--env',
  `POSTGRES_PASSWORD=${DB_PASSWORD}`,
  '--env',
  `POSTGRES_DB=${DB_NAME}`,
  POSTGRES_IMAGE,
);
if (started.exitCode !== 0) {
  console.error(`✗ test:e2e: could not start ${POSTGRES_IMAGE}:\n${started.stderr.toString()}`);
  process.exit(1);
}

let removed = false;
const teardown = () => {
  if (removed) {
    return;
  }
  removed = true;
  docker('rm', '-f', container);
};
// On the first signal, ask Playwright to stop with SIGINT, whatever signal we got. SIGINT is the
// only one Playwright handles gracefully: SIGTERM/SIGHUP kill it outright and leave its webServer
// (`vite preview`) listening on :4173, which breaks the next run. Then fall through to the teardown
// below once it exits. Forwarding matters when only this process is signalled (a harness killing
// its command); for a terminal Ctrl-C, Playwright gets it from the process group as well. If
// Playwright hasn't exited after a grace period, SIGKILL it. A second signal, or one before
// Playwright started, tears down and exits at once.
const SHUTDOWN_GRACE_MS = 15_000;
let interrupted = false;
const onSignal = () => {
  if (child && !interrupted) {
    interrupted = true;
    child.kill('SIGINT');
    setTimeout(() => child?.kill('SIGKILL'), SHUTDOWN_GRACE_MS).unref();
    return;
  }
  teardown();
  process.exit(130);
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(signal, onSignal);
}
process.on('exit', teardown);

function fail(message: string): never {
  console.error(`✗ test:e2e: ${message}`);
  teardown();
  process.exit(1);
}

// e.g. "127.0.0.1:49153"
const port = docker('port', container, '5432/tcp').stdout.toString().trim().split(':').at(-1);
if (!port) {
  fail('could not read the Postgres container port.');
}

// pg_isready over TCP: the image's init phase runs a socket-only temporary server, so a TCP
// probe only succeeds once the real server (with POSTGRES_DB created) is accepting connections.
const deadline = Date.now() + READY_TIMEOUT_MS;
while (
  docker('exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', DB_USER, '-d', DB_NAME).exitCode !== 0
) {
  if (Date.now() > deadline) {
    fail(`Postgres was not ready after ${READY_TIMEOUT_MS / 1000}s.`);
  }
  // Polling is inherently sequential.
  // oxlint-disable-next-line eslint/no-await-in-loop
  await Bun.sleep(250);
}

const databaseUrl = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}/${DB_NAME}?schema=public`;
console.log(`▶ test:e2e: throwaway Postgres ${container} on :${port}`);

let code = 1;
try {
  code = await playwright({
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_DATABASE_URL: databaseUrl,
    // global-setup.ts refuses to touch a DB outside CI unless this marks it as disposable.
    E2E_EPHEMERAL_DB: '1',
  });
} finally {
  teardown();
}
process.exit(code);
