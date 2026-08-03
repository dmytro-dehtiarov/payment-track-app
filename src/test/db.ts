import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");

function applyMigrations(dbPath: string) {
  const db = new Database(dbPath);
  const migrationDirs = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((entry) => fs.statSync(path.join(MIGRATIONS_DIR, entry)).isDirectory())
    .sort();

  for (const dir of migrationDirs) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf-8");
    db.exec(sql);
  }
  db.close();
}

/**
 * Spins up a throwaway SQLite file DB with the real schema applied (via the
 * committed migration.sql, not a mock), returning a Prisma client bound to it.
 * Uses a real temp file rather than :memory: because better-sqlite3 opens a
 * fresh connection per adapter instance, and :memory: databases don't survive
 * across separate connections.
 */
export function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `ptrack-test-${crypto.randomUUID()}.db`);
  applyMigrations(dbPath);

  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    async cleanup() {
      await prisma.$disconnect();
      for (const suffix of ["", "-journal", "-wal", "-shm"]) {
        const file = `${dbPath}${suffix}`;
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    },
  };
}
