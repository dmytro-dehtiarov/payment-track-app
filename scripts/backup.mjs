#!/usr/bin/env node
// Daily SQLite backup (Architecture.md ch.9). Uses better-sqlite3's online
// backup API rather than `cp`, so a backup taken while the app is writing
// can't land on a torn/corrupt copy of the file.
//
// Run inside the container: `docker compose exec app node scripts/backup.mjs`
// Schedule it from the host crontab, e.g.:
//   0 3 * * * cd /path/to/payment-track-app && docker compose exec -T app node scripts/backup.mjs

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DB_PATH = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(/^file:/, "");
const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 14);

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);

  const db = new Database(DB_PATH, { readonly: true });
  await db.backup(destPath);
  db.close();
  console.log(`Backed up ${DB_PATH} -> ${destPath}`);

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(BACKUP_DIR)) {
    if (!file.startsWith("backup-") || !file.endsWith(".db")) continue;
    const filePath = path.join(BACKUP_DIR, file);
    if (fs.statSync(filePath).mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      console.log(`Removed old backup ${file}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
