import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/drizzle",
  dbCredentials: {
    // Run via `bun run db:push` so Bun loads .env into the process.
    url: process.env.DATABASE_URL!,
  },
});
