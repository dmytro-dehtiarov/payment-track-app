import "dotenv/config";
import { defineConfig } from "prisma/config";

const tursoUrl = process.env["TURSO_DATABASE_URL"];
const tursoAuthToken = process.env["TURSO_AUTH_TOKEN"];

// CLI operations (migrate, studio, db pull) go through the datasource url
// directly -- there's no separate authToken field here like the JS adapter
// takes, so it's appended as a query param for Turso.
const datasourceUrl =
  tursoUrl && tursoAuthToken
    ? `${tursoUrl}?authToken=${tursoAuthToken}`
    : (process.env["DATABASE_URL"] ?? tursoUrl);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
