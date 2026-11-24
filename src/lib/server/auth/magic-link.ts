import { magicLink } from 'better-auth/plugins';

import { sendMagicLinkEmail } from '../email';

const MAGIC_LINK_EXPIRES_IN_SECONDS = 60 * 10; // 10 minutes

export const magicLinkPlugin = magicLink({
  expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
  sendMagicLink: async ({ email, url }) => {
    await sendMagicLinkEmail(email, url);
  },
});
