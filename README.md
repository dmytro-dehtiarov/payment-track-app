# Debt Tracker

Personal single-user web app for tracking who owes you money and who you owe, per client, with invoice/payment history and a turnover report. Full design in [`Architecture.md`](./Architecture.md).

Stack: Next.js 16 (App Router) · Prisma 7 + SQLite (via `better-sqlite3` driver adapter) · NextAuth.js (Auth.js v5, credentials) · next-intl (ru/en) · Tailwind CSS 4 · Vitest.

## Local development

Requires Node.js 24+ and npm.

```bash
npm install
cp .env.example .env   # then edit AUTH_SECRET and ADMIN_INITIAL_PASSWORD
npx prisma migrate dev --name init   # only needed once, or after schema changes
npx prisma db seed                   # creates the single Settings row + admin password
npm run dev
```

Open http://localhost:3000 and log in with `ADMIN_INITIAL_PASSWORD`. Change it afterwards from the Settings page — `prisma db seed` only sets it once and no-ops on every run after that.

### Environment variables

See [`.env.example`](./.env.example):

- `DATABASE_URL` — SQLite file path, e.g. `file:./prisma/dev.db`.
- `AUTH_SECRET` — session JWT signing/encryption key. Generate one with `openssl rand -base64 32`.
- `ADMIN_INITIAL_PASSWORD` — only read once, at seed time.

### Common commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build         # production build
npm start             # run the production build (after `npm run build`)
npm test               # run the Vitest suite once
npm run test:watch     # watch mode
npm run lint            # ESLint
npx prisma studio        # browse the local database
npx prisma migrate dev --name <description>   # create + apply a new migration after editing schema.prisma
```

## Architecture notes worth knowing before touching the code

- **Balance is never stored.** `SUM(invoices.amountMinor) - SUM(payments.amountMinor)`, computed on every read (`src/lib/balance.ts`). Don't add a cached `balance` column.
- **Money is always `amountMinor: Int`** (cents/kopecks), never a float. All `/100` and `*100` conversions go through `src/lib/money.ts` — don't do the math inline elsewhere.
- **Every page is `force-dynamic`** (set once in `src/app/layout.tsx`). This app reads live Settings/client data on every request; nothing here should ever be statically prerendered, or a production build would freeze data at build time.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (`src/proxy.ts`) — route protection logic itself lives in the `authorized` callback in `src/auth.ts`.
- **`trustHost: true` in `src/auth.ts` is required** for this to work at all outside `next dev` — Auth.js's production-only `UntrustedHost` guard would otherwise 500 every request on a self-hosted deployment with no fixed public hostname.
- **Route Handlers check the session themselves** (`src/lib/session.ts`) in addition to the proxy-level guard, as defense in depth.

## Testing

`npm test` runs the full Vitest suite (business logic + API route handlers) against a real temporary SQLite file per test suite (via `src/test/db.ts`, schema applied from the committed migration SQL) — not mocks. Route-handler tests mint a real Auth.js session JWT (`src/test/session.ts`) rather than stubbing auth away.

## Docker deployment

```bash
cp .env.example .env   # AUTH_SECRET and ADMIN_INITIAL_PASSWORD; DATABASE_URL is fixed by docker-compose.yml
docker compose up --build -d
```

The SQLite file lives on a named volume (`db-data:/app/data`), independent of the app image — rebuilding the image doesn't touch it. On every container start, `docker-entrypoint.sh` runs `prisma migrate deploy` and `prisma db seed` (both idempotent, safe to run repeatedly).

By default the app is only reachable on the local network (`ports: 3000:3000`, no TLS). If you expose it to the internet, put a reverse proxy (Caddy/Nginx) with HTTPS in front rather than publishing the container port directly — the app already detects `X-Forwarded-Proto: https` from a trusted proxy and correctly marks the session cookie `Secure` when it's actually running over HTTPS.

**Note:** the Docker image itself has not been built/run in this environment (Docker isn't installed here) — `Dockerfile`/`docker-compose.yml` are authored but only verified by static review and by exercising `docker-entrypoint.sh`'s underlying commands (`prisma migrate deploy`, `prisma db seed`) directly. Verify `docker compose up --build` once on a machine with Docker before relying on it.

### Backups

```bash
# one-off, or from a host crontab (e.g. daily at 3am):
docker compose exec app node scripts/backup.mjs
```

Uses `better-sqlite3`'s online backup API (safe to run while the app is live, unlike `cp`), writes timestamped copies to `/app/data/../backups` inside the container (mount that path too if you want backups on the host), and prunes anything older than `BACKUP_RETENTION_DAYS` (default 14).

## Known gaps

- `npm audit` reports a few advisories in transitive dependencies of `next` (postcss/sharp) and `exceljs` (uuid) with no non-breaking fix available; not currently exploitable in this app's usage pattern, but worth re-checking on future `npm outdated` passes.
- Full interactive browser testing (click-through of every form, mobile viewport testing) wasn't possible in the environment this app was built in (no connected browser) — behavior was verified via direct HTTP requests against `next start` and via the automated test suite instead. Do a manual pass in an actual browser, including on a phone, before relying on this day to day.
