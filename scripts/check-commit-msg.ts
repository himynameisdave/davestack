#!/usr/bin/env bun
/**
 * commit-msg hook. Enforces davestack's emoji-commit convention with zero deps
 * (no commitlint). The subject line must be:
 *
 *     {emoji} {short imperative description}
 *
 * i.e. start with a single emoji grapheme, then one space, then a non-empty
 * description. Subject must be <= 72 characters. The body (lines after the
 * subject) is never inspected.
 *
 * Exceptions (passed through unchecked):
 *   - Merge commits          ("Merge ...")
 *   - Revert commits         ("Revert ...")
 *   - Release commits        ("🔖 Release vX.Y.Z")  ← made by release.yml
 *   - fixup!/squash! commits (rebase autosquash)
 */
import { readFileSync } from 'node:fs';

const MAX_SUBJECT = 72;

const msgPath = process.argv[2];
if (!msgPath) {
  console.error('✗ check-commit-msg: no commit message file passed');
  process.exit(1);
}

const raw = readFileSync(msgPath, 'utf8');

// The subject is the first non-empty, non-comment line (git strips # comments).
const subject =
  raw
    .split('\n')
    .map((l) => l.replace(/\r$/u, ''))
    .find((l) => l.trim().length > 0 && !l.startsWith('#')) ?? '';

function pass(): never {
  process.exit(0);
}

function fail(reason: string): never {
  console.error(`\n✗ Invalid commit message: ${reason}\n`);
  console.error(`  subject: "${subject}"\n`);
  console.error('  davestack uses emoji commits: {emoji} {short description}');
  console.error('  e.g.  ✨ add passkey management to account page');
  console.error(
    `  Subject must start with an emoji + space, then text, and be <= ${MAX_SUBJECT} chars.\n`,
  );
  process.exit(1);
}

// --- Allowed pass-throughs ---
if (
  subject.startsWith('Merge ') ||
  subject.startsWith('Revert ') ||
  subject.startsWith('fixup! ') ||
  subject.startsWith('squash! ') ||
  /^🔖 Release v\d+\.\d+\.\d+$/u.test(subject)
) {
  pass();
}

if (subject.length === 0) fail('empty subject');

// Length check (count code points, so a leading emoji counts as one).
let length = 0;
for (const _ of subject) length += 1;
if (length > MAX_SUBJECT) fail(`subject is ${length} chars (max ${MAX_SUBJECT})`);

// Grab the first grapheme cluster (handles ZWJ sequences, flags, skin tones).
const emojiLike = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const first = [...segmenter.segment(subject)][0]?.segment ?? '';

if (!emojiLike.test(first)) fail('must start with an emoji');

// After the emoji grapheme there must be a single space, then a description.
const rest = subject.slice(first.length);
if (!rest.startsWith(' ')) fail('emoji must be followed by a space');
if (rest.slice(1).trim().length === 0) fail('missing description after the emoji');

pass();
