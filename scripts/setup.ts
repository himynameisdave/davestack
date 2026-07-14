#!/usr/bin/env bun
/**
 * Interactive first-run setup for a fresh clone of the davestack template.
 *
 * Run it once, right after `bun install`, with `bun run setup`. It:
 *   1. asks for your project name and rewrites the template's branding
 *      (package.json name, the <title>, the PWA manifest, the visible app name);
 *   2. creates `.env.local` with a freshly generated BETTER_AUTH_SECRET
 *      (never clobbers an existing one without asking);
 *   3. brings up the local Postgres, pushes the schema, and seeds it;
 *   4. checks that the git hooks were installed by `bun install`'s prepare step.
 *
 * It is idempotent and safe to re-run: already-renamed branding is left alone and
 * an existing `.env.local` is only touched with your confirmation.
 */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const ROOT = process.cwd();
const rl = createInterface({ input: process.stdin, output: process.stdout });

function log(msg: string) {
  console.log(msg);
}

async function ask(question: string, fallback = ''): Promise<string> {
  if (!process.stdin.isTTY) return fallback;
  const answer = (await rl.question(question)).trim();
  return answer || fallback;
}

async function confirm(question: string): Promise<boolean> {
  const answer = (await ask(`${question} [y/N] `)).toLowerCase();
  return answer === 'y' || answer === 'yes';
}

// A package.json `name` must be lowercase, url-safe, no leading dot/underscore.
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replaceAll(/[^a-z0-9-~]+/gu, '-')
      .replaceAll(/^[-_.]+|[-_.]+$/gu, '') || 'my-app'
  );
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function write(path: string, content: string): void {
  writeFileSync(join(ROOT, path), content);
}

// Replace the exact display string in a file, only if present (keeps re-runs safe).
function replaceInFile(path: string, from: string, to: string): boolean {
  const full = join(ROOT, path);
  if (!existsSync(full)) return false;
  const before = readFileSync(full, 'utf8');
  if (!before.includes(from)) return false;
  writeFileSync(full, before.replaceAll(from, to));
  return true;
}

// The Svelte files that render the visible "davestack" wordmark as text.
const BRAND_FILES = [
  'src/routes/(marketing)/+page.svelte',
  'src/routes/(auth)/login/+page.svelte',
  'src/routes/(auth)/signup/+page.svelte',
  'src/routes/(auth)/forgot-password/+page.svelte',
  'src/routes/(auth)/reset-password/+page.svelte',
  'src/routes/(auth)/verify-email/+page.svelte',
  'src/routes/(app)/+layout.svelte',
  'src/routes/(admin)/admin/+layout.svelte',
];

function rebrand(displayName: string): void {
  const slug = slugify(displayName);

  // package.json name (slug form).
  const pkg = JSON.parse(read('package.json')) as { name: string };
  if (pkg.name !== slug) {
    pkg.name = slug;
    write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
    log(`  · package.json name → "${slug}"`);
  }

  // Visible wordmark in the UI.
  let uiHits = 0;
  for (const file of BRAND_FILES) {
    if (replaceInFile(file, '>davestack<', `>${displayName}<`)) uiHits += 1;
  }
  if (uiHits > 0) log(`  · app wordmark → "${displayName}" (${uiHits} file(s))`);

  // <title> + apple web-app title in app.html.
  const titleHit = replaceInFile(
    'src/app.html',
    '<title>davestack</title>',
    `<title>${displayName}</title>`,
  );
  replaceInFile('src/app.html', 'content="davestack"', `content="${displayName}"`);
  if (titleHit) log(`  · document <title> → "${displayName}"`);

  // PWA manifest name + short_name.
  const manifestPath = 'static/manifest.webmanifest';
  if (existsSync(join(ROOT, manifestPath))) {
    const manifest = JSON.parse(read(manifestPath)) as Record<string, unknown>;
    manifest.name = displayName;
    manifest.short_name = displayName;
    write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    log(`  · PWA manifest name/short_name → "${displayName}"`);
  }
}

function ensureEnvSecret(overwrite: boolean): void {
  const target = join(ROOT, '.env.local');
  if (existsSync(target) && !overwrite) {
    log('  · .env.local exists — left untouched (re-run and confirm to regenerate).');
    return;
  }
  const secret = randomBytes(32).toString('base64');
  // Start from the documented .env.example so every knob is present + commented.
  const base = existsSync(join(ROOT, '.env.example'))
    ? read('.env.example')
    : 'BETTER_AUTH_SECRET=\n';
  const withSecret = base.replace(/^BETTER_AUTH_SECRET=.*$/mu, `BETTER_AUTH_SECRET="${secret}"`);
  write('.env.local', withSecret);
  log('  · .env.local written with a fresh BETTER_AUTH_SECRET.');
}

function run(cmd: string, label: string): boolean {
  try {
    log(`\n▶ ${label}`);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch {
    log(`  ✗ "${cmd}" failed — run it yourself once the prerequisite is ready.`);
    return false;
  }
}

async function main(): Promise<void> {
  log('davestack setup\n───────────────');

  const displayName = await ask('Project name (leave blank to keep "davestack"): ', '');
  if (displayName) {
    log('\nRebranding:');
    rebrand(displayName);
  } else {
    log('\nKeeping the "davestack" branding.');
  }

  log('\nEnvironment:');
  let overwrite = false;
  if (existsSync(join(ROOT, '.env.local'))) {
    overwrite = await confirm('.env.local already exists. Overwrite it (regenerating the secret)?');
  }
  ensureEnvSecret(overwrite);

  const bringUpDb = await confirm('\nStart the local Postgres and set up the database now?');
  if (bringUpDb) {
    run('docker compose up -d db', 'Starting Postgres (docker compose up -d db)');
    run('bun run db:push', 'Pushing the schema (bun run db:push)');
    run('bun run db:seed', 'Seeding (bun run db:seed)');
  } else {
    log('  · Skipped. Later: docker compose up -d db && bun run db:push && bun run db:seed');
  }

  log('\nGit hooks:');
  if (existsSync(join(ROOT, '.husky/_'))) {
    log('  · Husky hooks installed (bun install ran the prepare step). ✓');
  } else {
    log(
      '  ⚠ .husky/_ is missing — hooks are NOT installed. Run `bun install` (it runs `prepare`).',
    );
  }

  log('\nDone. Start the dev server with:  bun run dev');
  rl.close();
}

main().catch((error: unknown) => {
  console.error(error);
  rl.close();
  process.exit(1);
});
