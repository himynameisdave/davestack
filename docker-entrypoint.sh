#!/bin/sh
# Prisma's advisory lock serializes migrations during concurrent starts.
set -e

echo "▶ Applying database migrations (prisma migrate deploy)…"
bunx prisma migrate deploy

echo "▶ Starting server…"
exec "$@"
