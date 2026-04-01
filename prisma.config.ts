import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local so Prisma CLI commands (migrate, seed) pick up the same
// variables that Next.js loads at runtime.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Used by Prisma CLI for migrations
    url: process.env.DATABASE_URL!,
    // directUrl bypasses connection pooling for migrate commands
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
