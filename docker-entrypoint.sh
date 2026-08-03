#!/bin/sh
set -e

# Idempotent: migrate deploy only applies pending migrations, and
# `prisma db seed` (see prisma/seed.ts) no-ops once the Settings row exists --
# safe to run on every container start.
npx prisma migrate deploy
npx prisma db seed

exec "$@"
