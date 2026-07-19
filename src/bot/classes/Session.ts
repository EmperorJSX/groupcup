import ms from "ms";
import { DEFAULT_STATE, type NewState } from "@/constants/bot";
import type Context from "./Context";
import redis, { getRedisPrefix } from "@/config/redis";

/**
 * Generates a unique Redis key for a session variable
 */
function createSessionKey(ctx: Context, key: string): string {
  return getRedisPrefix(`${ctx.me.username}:session:${ctx.from!.id}:${key}`);
}

/**
 * Manages user session data using Redis as the storage backend
 */
export default class Session {
  private ctx: Context;
  public state: NewState = DEFAULT_STATE;

  /**
   * Creates a new session handler for the given context
   */
  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  /**
   * Retrieves a value from the session storage
   */
  async get(key: string): Promise<string | null> {
    if (!this.ctx.from) {
      return null;
    }

    const redisKey = createSessionKey(this.ctx, key);
    return await redis.get(redisKey);
  }

  /**
   * Retrieves and immediately deletes a value from session storage
   */
  async getAndDelete(key: string): Promise<string | null> {
    if (!this.ctx.from) {
      return null;
    }

    const redisKey = createSessionKey(this.ctx, key);
    return await redis.getdel(redisKey);
  }

  /**
   * Retrieves multiple values from session storage at once
   */
  async getAll(keys: string[]): Promise<(string | null)[]> {
    if (!this.ctx.from) {
      return [];
    }

    const redisKeys = keys.map((key) => createSessionKey(this.ctx, key));
    return await redis.mget(redisKeys);
  }

  /**
   * Stores a value in session storage with optional expiration time
   */
  async set(
    key: string,
    {
      value,
      ttlMs = ms("1w"),
    }: {
      value: string | Record<string, unknown> | Array<unknown>;
      ttlMs?: number;
    },
  ): Promise<"OK" | null> {
    if (!this.ctx.from) {
      return null;
    }

    const redisKey = createSessionKey(this.ctx, key);
    const redisArgs: (string | number)[] = [
      redisKey,
      typeof value === "object" ? JSON.stringify(value) : value,
    ];

    if (ttlMs) {
      redisArgs.push("PX", ttlMs);
    }

    return await redis.set(...(redisArgs as [string, string, "PX", number]));
  }

  /**
   * Stores multiple key-value pairs in session storage with the same expiration
   */
  async setMany(
    keyValuePairs: Record<
      string,
      string | Record<string, unknown> | Array<unknown>
    >,
    expirationTimeMs = ms("7d"),
  ): Promise<"OK" | null> {
    if (!this.ctx.from) {
      return null;
    }

    const setCommands = Object.entries(keyValuePairs).map(
      ([key, value]) =>
        [
          "set",
          createSessionKey(this.ctx, key),
          typeof value === "object" ? JSON.stringify(value) : value,
          "PX",
          expirationTimeMs,
        ] as ["set", string, string, "PX", number],
    );

    return redis
      .pipeline(setCommands)
      .exec()
      .then(() => "OK" as const)
      .catch((error) => {
        console.error("Failed to set multiple session values:", error);
        return null;
      });
  }

  /**
   * Deletes a value from session storage
   */
  async delete(key: string): Promise<number> {
    if (!this.ctx.from) {
      return 0;
    }

    const redisKey = createSessionKey(this.ctx, key);
    return await redis.del(redisKey);
  }

  /**
   * Checks if a session value exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.ctx.from) {
      return false;
    }

    const redisKey = createSessionKey(this.ctx, key);
    const result = await redis.exists(redisKey);
    return result > 0;
  }

  /**
   * Sets the expiration time on a session value
   */
  async expire(key: string, expirationTimeMs: number): Promise<boolean> {
    if (!this.ctx.from) {
      return false;
    }

    const redisKey = createSessionKey(this.ctx, key);
    const result = await redis.pexpire(redisKey, expirationTimeMs);
    return result === 1;
  }
}
