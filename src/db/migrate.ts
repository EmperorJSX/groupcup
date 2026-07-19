import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Standalone migration runner (`bun run db:migrate`).
 * Reads DATABASE_URL directly, since Bun loads .env for scripts.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: "./src/db/drizzle" });
await client.end();

console.log("Migrations applied");
