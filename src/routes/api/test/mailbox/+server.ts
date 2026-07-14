import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { testMailbox } from '$lib/server/email';
import { isTestMode } from '$lib/server/env';

// Test-only view onto the in-memory outbox. Guarded so it exists ONLY under
// TEST_MODE — in dev/prod it 404s (the mailbox is never populated there anyway).
// Phase 8 e2e polls this to pull verification / magic-link / reset tokens.

// GET /api/test/mailbox           → every captured email, newest first
// GET /api/test/mailbox?to=<addr> → only emails addressed to <addr>
export const GET: RequestHandler = ({ url }) => {
  if (!isTestMode) error(404);

  const to = url.searchParams.get('to');
  const matches = to === null ? testMailbox : testMailbox.filter((message) => message.to === to);

  // Newest first so a poller can read [0] without knowing the length.
  // toReversed() returns a copy, leaving the shared array in insertion order.
  return json(matches.toReversed());
};

// DELETE /api/test/mailbox → clear the outbox (reset between e2e specs).
export const DELETE: RequestHandler = () => {
  if (!isTestMode) error(404);

  testMailbox.length = 0;
  return json({ cleared: true });
};
