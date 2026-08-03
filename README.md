# Debt Tracker

Personal single-user web app for tracking who owes you money and who you owe, per client, with invoice/payment history and a turnover report. Full design in [`Architecture.md`](./Architecture.md).

Stack: Next.js 16 (App Router) · Prisma 7 + Turso/LibSQL (via `@prisma/adapter-libsql`) · NextAuth.js (Auth.js v5, credentials) · next-intl (ru/en) · Tailwind CSS 4 · Vitest. Deploys to Vercel.

## Local development

Requires Node.js 24+ and npm.

```bash
npm install
cp .env.example .env   # then edit AUTH_SECRET, ADMIN_INITIAL_PASSWORD, and TURSO_DATABASE_URL/TURSO_AUTH_TOKEN
npx prisma migrate dev --name init   # only needed once, or after schema changes -- applies to the LOCAL SQLite file
npm run db:migrate:turso              # replays the same migration(s) against Turso -- see below for why this is separate
npx prisma db seed                   # creates the single Settings row + admin password on whichever DB is active
npm run dev
```

Open http://localhost:3000 and log in with `ADMIN_INITIAL_PASSWORD`. Change it afterwards from the Settings page — `prisma db seed` only sets it once and no-ops on every run after that.

If `TURSO_DATABASE_URL` is unset, the app and `prisma db seed` fall back to the local SQLite file at `DATABASE_URL` — useful for fully offline work, but note the two databases are then independent copies.

### Environment variables

See [`.env.example`](./.env.example):

- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — the real database (Turso dashboard → your DB → `turso db show <db> --url` and `turso db tokens create <db>`). Used whenever set, both locally and in production.
- `DATABASE_URL` — local SQLite file, only used as a fallback when the Turso vars above are unset.
- `AUTH_SECRET` — session JWT signing/encryption key. Generate one with `openssl rand -base64 32`.
- `ADMIN_INITIAL_PASSWORD` — only read once, at seed time.

### Common commands

```bash
npm run dev                # dev server (localhost:3000)
npm run build                # production build
npm start                     # run the production build (after `npm run build`)
npm test                       # run the Vitest suite once
npm run test:watch             # watch mode
npm run lint                    # ESLint
npx prisma studio                 # browse whichever DB is active (Turso if set, else local file)
npx prisma migrate dev --name <description>   # create + apply a new migration, against the LOCAL file only
npm run db:migrate:turso                        # deploy pending migrations to Turso (see below)
```

## Architecture notes worth knowing before touching the code

- **Balance is never stored.** `SUM(invoices.amountMinor) - SUM(payments.amountMinor)`, computed on every read (`src/lib/balance.ts`). Don't add a cached `balance` column.
- **Money is always `amountMinor: Int`** (cents/kopecks), never a float. All `/100` and `*100` conversions go through `src/lib/money.ts` — don't do the math inline elsewhere.
- **Every page is `force-dynamic`** (set once in `src/app/layout.tsx`). This app reads live Settings/client data on every request; nothing here should ever be statically prerendered, or a production build would freeze data at build time.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (`src/proxy.ts`) — route protection logic itself lives in the `authorized` callback in `src/auth.ts`.
- **`trustHost: true` in `src/auth.ts` is required** for this to work at all outside `next dev` — Auth.js's production-only `UntrustedHost` guard would otherwise 500 every request without a fixed, pre-registered hostname.
- **Route Handlers check the session themselves** (`src/lib/session.ts`) in addition to the proxy-level guard, as defense in depth.
- **Migrations are authored locally, deployed to Turso separately.** `prisma migrate dev` develops migrations against the local SQLite file as usual and is the source of truth for the SQL. Prisma's CLI migration engine (a Rust binary) can't talk to `libsql://` URLs though (fails with `P1013`), so `npm run db:migrate:turso` (`scripts/migrate-turso.mjs`) replays the same `migration.sql` files against Turso directly via `@libsql/client`, tracking what's applied in a `_prisma_migrations` table shaped like Prisma's own. Run it after every `prisma migrate dev` that you want live.
- **`src/lib/db.ts` picks the adapter based on env vars**: `@prisma/adapter-libsql` when `TURSO_DATABASE_URL` is set, else `@prisma/adapter-better-sqlite3` against the local file. Tests (`src/test/db.ts`) always use the local-file adapter directly, independent of this — they don't touch Turso.

## Testing

`npm test` runs the full Vitest suite (business logic + API route handlers) against a real temporary SQLite file per test suite (via `src/test/db.ts`, schema applied from the committed migration SQL) — not mocks, and not Turso either (kept local for speed and to avoid a network dependency in tests). Route-handler tests mint a real Auth.js session JWT (`src/test/session.ts`) rather than stubbing auth away.

## Deploying to Vercel

1. Push to GitHub (already done — https://github.com/dmytro-dehtiarov/payment-track-app) and import the repo in Vercel.
2. In the Vercel project's Environment Variables, set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `ADMIN_INITIAL_PASSWORD` (same values as your local `.env`, or rotate `AUTH_SECRET` for production).
3. Before (or after) the first deploy, make sure the Turso database has the schema and seed applied: `npm run db:migrate:turso && npx prisma db seed` from a machine with the Turso env vars set (this doesn't run automatically as part of the Vercel build — Vercel's build step only runs `next build`, which needs no DB access at all thanks to `force-dynamic`).
4. Deploy. Vercel handles HTTPS itself, and Auth.js's `trustHost: true` + its own forwarded-header detection means the session cookie gets `Secure` automatically.

Turso backs up and lets you restore the database itself (see the Turso dashboard/CLI) — there's no separate backup step to run in this app.

## Known gaps

- `npm audit` reports a few advisories in transitive dependencies of `next` (postcss/sharp) and `exceljs` (uuid) with no non-breaking fix available; not currently exploitable in this app's usage pattern, but worth re-checking on future `npm outdated` passes.
- Full interactive browser testing (click-through of every form, mobile viewport testing) wasn't possible in the environment this app was built in (no connected browser) — behavior was verified via direct HTTP requests against `next start`/`next dev`, direct queries against Turso, and the automated test suite instead. Do a manual pass in an actual browser, including on a phone, before relying on this day to day.
- The actual `vercel deploy` / production Vercel environment has not been exercised yet — only local `next dev`/`next start` against the real Turso database.
