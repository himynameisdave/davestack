import { passkey } from '@better-auth/passkey';

import { env } from '../env';

// Changing the origin orphans existing passkeys. See the README for deployment details.
const rpID = env.PASSKEY_RP_ID ?? new URL(env.BETTER_AUTH_URL).hostname;

export const passkeyPlugin = passkey({
  rpID,
  rpName: 'davestack',
  origin: env.BETTER_AUTH_URL,
});
