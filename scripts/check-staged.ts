#!/usr/bin/env bun
/**
 * Pre-commit "garbage blocker". Hard-fails a commit when a staged file contains
 * something that should never land in history. Runs as the final lint-staged
 * step. Blockers:
 *
 *   - test focus/skip:  `.only(` / `.skip(` in *.spec.ts / *.test.ts (or .js)
 *   - `debugger` statements
 *   - git conflict markers  (<<<<<<<, =======, >>>>>>>)
 *   - `console.log` outside src/lib/server/**, scripts/**, tests/**
 *   - any staged .env* file  EXCEPT .env.example / .env.test
 *
 * File list: lint-staged passes staged filenames as argv. When invoked with no
 * args (e.g. by hand) it reads the staged list itself, so `bun scripts/check-staged.ts`
 * works standalone too.
 */
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { relative } from 'node:path';

type Violation = { file: string; line: number; message: string };

const CWD = process.cwd();

// Directories where console.log is allowed (server logging, scripts, tests).
const CONSOLE_ALLOWED = [/^src\/lib\/server\//u, /^scripts\//u, /^tests\//u];

// .env files that ARE allowed to be committed.
const ENV_ALLOWED = new Set(['.env.example', '.env.test']);

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|svelte)$/u;
const TEST_FILE = /\.(spec|test)\.(ts|tsx|js|jsx|mjs|cjs)$/u;
const ENV_FILE = /^\.env($|\.)/u;

function stagedFiles(): string[] {
  const args = process.argv.slice(2);
  if (args.length > 0) return args.map((f) => relative(CWD, f) || f);
  const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function readText(file: string): string | null {
  try {
    if (!statSync(file).isFile()) return null;
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function basename(file: string): string {
  return file.split('/').pop() ?? file;
}

const violations: Violation[] = [];

for (const rawFile of stagedFiles()) {
  // Normalise to a repo-relative POSIX-ish path for matching.
  const file = rawFile.replaceAll('\\', '/');
  const base = basename(file);

  // --- .env* files (path check, no content read needed) ---
  if (ENV_FILE.test(base) && !ENV_ALLOWED.has(base)) {
    violations.push({
      file,
      line: 0,
      message: `staged env file "${base}" — only .env.example and .env.test may be committed`,
    });
    continue;
  }

  const text = readText(rawFile);
  if (text === null) continue;
  const lines = text.split('\n');
  const isCode = CODE_EXT.test(file);
  const isTest = TEST_FILE.test(file);
  const consoleAllowed = CONSOLE_ALLOWED.some((re) => re.test(file));

  lines.forEach((line, i) => {
    const n = i + 1;

    // Conflict markers — any text file.
    if (/^<{7}(\s|$)/u.test(line) || /^={7}$/u.test(line) || /^>{7}(\s|$)/u.test(line)) {
      violations.push({ file, line: n, message: 'git conflict marker' });
    }

    if (isCode) {
      // `debugger` statement.
      if (/(^|[\s;{}])debugger\s*(;|$)/u.test(line)) {
        violations.push({ file, line: n, message: '`debugger` statement' });
      }
      // console.log outside allowed dirs.
      if (!consoleAllowed && /\bconsole\.log\s*\(/u.test(line)) {
        violations.push({
          file,
          line: n,
          message: 'console.log (only allowed in src/lib/server/**, scripts/**, tests/**)',
        });
      }
    }

    // Focused / skipped tests.
    if (isTest && /\.(only|skip)\s*\(/u.test(line)) {
      violations.push({ file, line: n, message: 'focused/skipped test (.only / .skip)' });
    }
  });
}

if (violations.length > 0) {
  console.error('\n✗ check-staged: commit blocked\n');
  for (const v of violations) {
    const where = v.line > 0 ? `${v.file}:${v.line}` : v.file;
    console.error(`  ${where}\n      ${v.message}`);
  }
  console.error('\nFix the above (or, in a real emergency, `git commit --no-verify`).\n');
  process.exit(1);
}
