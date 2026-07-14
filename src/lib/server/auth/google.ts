import { env } from '../env';

// Google OAuth registers ONLY when both env vars are present, so a fresh clone
// boots without real credentials and the Google button simply doesn't render.
// The `&&` guard narrows both values to `string` for the config below.
//
// To remove Google entirely: delete this file and drop `socialProviders` from
// the betterAuth() call in ./index.ts.
export const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;
