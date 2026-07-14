# syntax=docker/dockerfile:1
# Multi-stage Bun build producing the SvelteKit adapter-node server.
# Default deploy target is Railway; this image also runs anywhere Docker does.

# ── deps ─────────────────────────────────────────────────────────────────────
# Install the full dependency set once (the build needs dev deps; the runtime
# keeps them because `prisma migrate deploy` on boot needs the Prisma CLI, which
# is a devDependency).
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── build ────────────────────────────────────────────────────────────────────
# `bun run build` runs `svelte-kit sync && prisma generate && vite build`, so the
# Prisma client is generated into src/generated/prisma and the adapter-node
# server is emitted to /app/build.
FROM oven/bun:1.3 AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ── runtime ──────────────────────────────────────────────────────────────────
# adapter-node output is a plain Node/JS server; Bun runs it directly. Ships the
# build output, the generated Prisma client, the migrations, and node_modules
# (the Prisma CLI included, for the boot-time migration).
FROM oven/bun:1.3 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY package.json bun.lock ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# Migration strategy: run `prisma migrate deploy` on container BOOT (see
# docker-entrypoint.sh), NOT as a separate Railway release phase. Rationale:
# a template should deploy correctly with zero extra platform config — one image
# that migrates then serves. `migrate deploy` is idempotent and takes a Postgres
# advisory lock, so concurrent instance boots are safe. For high-instance-count
# deploys you may prefer a dedicated Railway release command running
# `bunx prisma migrate deploy` and removing the migrate step from the entrypoint.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "./build/index.js"]
