import "dotenv/config";
import { defineConfig } from "prisma/config";

// CLI operations (migrate dev/deploy, studio, db pull) always target the
// local SQLite file -- Prisma's CLI schema-engine can't connect to Turso's
// libsql:// URLs at all (fails with P1013), regardless of query params.
// Migrations are developed here, then deployed to Turso separately via
// `npm run db:migrate:turso` (scripts/migrate-turso.mjs), which doesn't go
// through this config.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
