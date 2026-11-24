import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Follow Vite's file precedence while letting deployment environment values take priority.
dotenv.config({ path: '.env.local' });
// oxlint-disable-next-line bun/no-dotenv -- the Prisma CLI runs under Node and needs this to load .env
dotenv.config();

// Fallback to the local Docker Compose database so a fresh clone can run
// `bun run db:push` / `bun run db:migrate` with zero config. Mirrors the default
// in src/lib/server/env.ts. Production sets DATABASE_URL explicitly.
const LOCAL_DATABASE_URL = 'postgresql://davestack:davestack@localhost:5432/davestack?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
    directUrl: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
  },
});
