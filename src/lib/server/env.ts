import { z } from 'zod';

// The same environment loader runs in SvelteKit and standalone Prisma scripts.

const DEV_AUTH_SECRET = 'dev-secret-change-me-before-deploying';
const LOCAL_DATABASE_URL = 'postgresql://davestack:davestack@localhost:5432/davestack?schema=public';
const LOCAL_AUTH_URL = 'http://localhost:5173';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().min(1).default(LOCAL_DATABASE_URL),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1).default(DEV_AUTH_SECRET),
  BETTER_AUTH_URL: z.url().default(LOCAL_AUTH_URL),

  PASSKEY_RP_ID: z.string().min(1).optional(),

  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  PUBLIC_UMAMI_WEBSITE_ID: z.string().min(1).optional(),
  PUBLIC_UMAMI_SRC: z.string().min(1).optional(),

  // Injected by Railway for the admin dashboard's deployment metadata.
  RAILWAY_GIT_COMMIT_SHA: z.string().optional(),

  TEST_MODE: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return parsed.data;
}

export const env = loadEnv();

// Validate production settings at runtime. Vite imports this module during builds without secrets.
export function assertProductionReady(): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }
  if (env.BETTER_AUTH_SECRET === DEV_AUTH_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is still the dev placeholder. Set a real secret in production (openssl rand -base64 32).',
    );
  }
  if (env.DATABASE_URL === LOCAL_DATABASE_URL) {
    throw new Error('DATABASE_URL still points at the local Docker database in production.');
  }
}

export function deriveFeatures(source: Readonly<Env>) {
  return {
    google: Boolean(source.GOOGLE_CLIENT_ID && source.GOOGLE_CLIENT_SECRET),
    resend: Boolean(source.RESEND_API_KEY),
    umami: Boolean(source.PUBLIC_UMAMI_WEBSITE_ID),
  } as const;
}

export const features = deriveFeatures(env);

export const isTestMode = env.TEST_MODE === '1' || env.TEST_MODE === 'true';
