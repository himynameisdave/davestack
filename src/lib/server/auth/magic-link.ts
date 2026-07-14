import { magicLink } from 'better-auth/plugins';
import { sendMagicLinkEmail } from '../email';

const MAGIC_LINK_EXPIRES_IN_SECONDS = 60 * 10; // 10 minutes

// Email magic-link sign-in. To remove: delete this file and drop
// `magicLinkPlugin` from the `plugins` array in ./index.ts (and the
// `magicLinkClient()` plugin in src/lib/client/auth.ts).
export const magicLinkPlugin = magicLink({
  expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
  sendMagicLink: async ({ email, url }) => {
    await sendMagicLinkEmail(email, url);
  },
});
