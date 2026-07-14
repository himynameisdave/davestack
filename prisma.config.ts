import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local first (Vite convention for local dev), then .env as fallback.
// Safe in production: both files are gitignored, dotenv silently skips missing
// files, and platform-provided env vars (e.g. Railway/Neon) take precedence over
// anything dotenv would set.
dotenv.config({ path: '.env.local' });
dotenv.config();

// Fallback to the local Docker Compose database so a fresh clone can run
// `bun run db:push` / `bun run db:migrate` with zero config. Mirrors the default
// in src/lib/server/env.ts. Production sets DATABASE_URL explicitly.
const LOCAL_DATABASE_URL =
  'postgresql://davestack:davestack@localhost:5432/davestack?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? LOCAL_DATABASE_URL,
    directUrl:
      process.env['DIRECT_DATABASE_URL'] ?? process.env['DATABASE_URL'] ?? LOCAL_DATABASE_URL,
  },
});
