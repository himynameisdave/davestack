import { describe, expect, it, vi } from 'vitest';

import { DELETE, GET } from './+server';

vi.mock(import('#lib/server/env.js'), async (importOriginal) => ({
  ...(await importOriginal()),
  isTestMode: false,
}));

describe('mailbox outside test mode', () => {
  it.each([
    ['GET', GET],
    ['DELETE', DELETE],
  ] as const)('returns 404 for %s', async (_method, handler) => {
    const event = { url: new URL('http://localhost/api/test/mailbox') } as Parameters<typeof handler>[0];
    await expect(async () => handler(event)).rejects.toMatchObject({ status: 404 });
  });
});
