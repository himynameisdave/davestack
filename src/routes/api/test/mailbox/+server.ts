import { error } from '@sveltejs/kit';

import { testMailbox } from '#lib/server/email/index.js';
import { isTestMode } from '#lib/server/env.js';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
  if (!isTestMode) {
    error(404);
  }

  const to = url.searchParams.get('to');
  const matches = to === null ? testMailbox : testMailbox.filter((message) => message.to === to);

  // Pollers can read the newest message at index 0 without mutating the shared buffer.
  return Response.json(matches.toReversed());
};

export const DELETE: RequestHandler = () => {
  if (!isTestMode) {
    error(404);
  }

  testMailbox.length = 0;
  return Response.json({ cleared: true });
};
