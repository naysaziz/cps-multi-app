import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local so Prisma CLI commands (migrate, seed) pick up the same
// variables that Next.js loads at runtime.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by Prisma CLI for migrations
    url: process.env.DATABASE_URL!,
    // shadowDatabaseUrl can be used for migrations if needed
    // directUrl is not supported in Prisma 7 config — use DATABASE_URL directly
  },
});
