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

const client = postgres(url);
const db = drizzle(client, { schema });

export { schema };
export default db;
