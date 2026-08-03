import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Turso/LibSQL when TURSO_DATABASE_URL is set (production, or local dev
 * testing against the real deployed DB before pushing); otherwise a local
 * SQLite file via DATABASE_URL, for offline dev/tests.
 */
function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  const adapter = tursoUrl
    ? new PrismaLibSql({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN })
    : new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });

  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
