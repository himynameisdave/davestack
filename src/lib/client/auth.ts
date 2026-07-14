import { createAuthClient } from 'better-auth/svelte';
import { magicLinkClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

// Client-side Better Auth. Plugins mirror the server plugins that need a client
// counterpart (magic link, passkey). Email+password and Google need no client
// plugin — they are built in.
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), passkeyClient()] as const,
});
