# syntax=docker/dockerfile:1
# Install the full dependency set once (the build needs dev deps; the runtime
# keeps them because `prisma migrate deploy` on boot needs the Prisma CLI, which
# is a devDependency).
FROM oven/bun:1.4.4 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.4.4 AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.4.4 AS runtime
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

# Migrate on boot so a template clone can deploy without a separate release job.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "./build/index.js"]
