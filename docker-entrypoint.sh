#!/bin/sh
# Container entrypoint: apply pending database migrations, then start the server.
# `prisma migrate deploy` only applies already-created migrations (it never
# generates or resets), is idempotent, and advisory-locks — safe to run on every
# boot. See the Dockerfile comment for why migrations run here vs. a release phase.
set -e

echo "▶ Applying database migrations (prisma migrate deploy)…"
bunx prisma migrate deploy

echo "▶ Starting server…"
exec "$@"
