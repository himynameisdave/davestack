import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

// Dynamic public values let deployment settings take effect at runtime.
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
