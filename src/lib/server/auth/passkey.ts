import { passkey } from '@better-auth/passkey';
import { env } from '../env';

// Passkeys (WebAuthn). The Relying Party ID + origin derive from BETTER_AUTH_URL
// so the same code works on localhost, a Railway preview URL, and a custom domain
// — you only ever set BETTER_AUTH_URL. PASSKEY_RP_ID overrides the RP ID for
// multi-subdomain setups.
//
// Passkeys are origin-bound: changing the domain orphans existing credentials.
// See the README "Passkeys across environments" section.
//
// No authenticatorSelection restriction here, so both platform authenticators
// (Face ID / Touch ID / Windows Hello) and roaming security keys are accepted.
//
// To remove: delete this file, drop `passkeyPlugin` from ./index.ts, drop
// `passkeyClient()` from src/lib/client/auth.ts, and remove the Passkey model.
const rpID = env.PASSKEY_RP_ID ?? new URL(env.BETTER_AUTH_URL).hostname;

export const passkeyPlugin = passkey({
  rpID,
  rpName: 'davestack',
  origin: env.BETTER_AUTH_URL,
});
