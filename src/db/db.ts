import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * DATABASE_URL is read directly (not via @/config/env) so importing @/db never
 * demands the full validated env: the landing app must boot with zero config,
 * and postgres() opens no socket until the first query runs.
 */
const url =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/groupcup";

// Short connect timeout (seconds) so the in-memory fallback in ./store kicks
// in fast when no postgres is running.
const client = postgres(url, {
  connect_timeout: Number(process.env.PG_CONNECT_TIMEOUT ?? 3),
});
const db = drizzle(client, { schema });

export { schema };
export default db;
