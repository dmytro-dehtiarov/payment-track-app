#!/usr/bin/env node
// Applies pending migrations to Turso directly via @libsql/client.
//
// Why this exists: Prisma's CLI migration engine (a Rust binary) doesn't
// understand `libsql://` URLs for the "sqlite" provider -- `prisma migrate
// deploy` fails with P1013 against Turso. Migrations are still authored and
// developed locally with `prisma migrate dev` against the local SQLite file
// (source of truth for the SQL); this script replays the same migration.sql
// files against Turso, tracking what's applied in a `_prisma_migrations`
// table shaped like Prisma's own (so `SELECT * FROM _prisma_migrations`
// reads the same way), but this script -- not the Prisma CLI -- is what
// actually deploys schema changes to Turso.
//
// Usage: node scripts/migrate-turso.mjs

import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../prisma/migrations");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not set.");
  process.exit(1);
}

function checksum(sql) {
  return crypto
    .createHash("sha256")
    .update(sql.replace(/\r\n/g, "\n"), "utf8")
    .digest("hex");
}

async function main() {
  const client = createClient({ url, authToken });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    TEXT PRIMARY KEY NOT NULL,
        "checksum"              TEXT NOT NULL,
        "finished_at"           DATETIME,
        "migration_name"        TEXT NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        DATETIME,
        "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const { rows } = await client.execute(`SELECT migration_name FROM "_prisma_migrations"`);
  const applied = new Set(rows.map((row) => row.migration_name));

  const migrationDirs = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((entry) => fs.statSync(path.join(MIGRATIONS_DIR, entry)).isDirectory())
    .sort();

  for (const dir of migrationDirs) {
    if (applied.has(dir)) {
      console.log(`Already applied: ${dir}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
    console.log(`Applying ${dir}...`);

    const tx = await client.transaction("write");
    try {
      await tx.executeMultiple(sql);
      await tx.execute({
        sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
              VALUES (?, ?, ?, ?, ?, 1)`,
        args: [crypto.randomUUID(), checksum(sql), Date.now(), dir, Date.now()],
      });
      await tx.commit();
      console.log(`Applied ${dir}`);
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }

  client.close();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
