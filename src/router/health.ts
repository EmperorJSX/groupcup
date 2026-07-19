import { Hono } from "hono";
import db from "@/db/db";
import { sql } from "drizzle-orm";
import redisClient from "@/config/redis";

/**
 * Health router. Mount under `/api`.
 *
 * `/health` returns 200 only when all hard dependencies (db, redis) are up.
 */

const healthApp = new Hono();

healthApp.get("/health", async (c) => {
  const checks: Record<string, "ok" | "error"> = {
    db: "ok",
    redis: "ok",
  };

  try {
    await db.execute(sql`select 1`);
  } catch {
    checks.db = "error";
  }

  try {
    const pong = await redisClient.ping();
    if (pong !== "PONG") checks.redis = "error";
  } catch {
    checks.redis = "error";
  }

  const ok = Object.values(checks).every((v) => v === "ok");
  return c.json(
    { success: ok, message: ok ? "OK" : "Degraded", checks },
    ok ? 200 : 503,
  );
});

export default healthApp;
