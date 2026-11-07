import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

// SvelteKit-managed env, imported via $app/env/public. Dynamic (the default, not
// `static: true`) so Railway runtime config wins over build-time baking. Both are
// optional: an unset value becomes '' and the layout skips Umami entirely.
// Server-only env stays in src/lib/server/env.ts.
export const variables = defineEnvVars({
  PUBLIC_UMAMI_WEBSITE_ID: {
    public: true,
    description: 'Umami website ID. Unset disables analytics.',
    schema: z.string().default(''),
  },
  PUBLIC_UMAMI_SRC: {
    public: true,
    description:
      'Umami script URL. Unset falls back to https://cloud.umami.is/script.js in the root layout.',
    schema: z.string().default(''),
  },
});
