import { RateLimiterRedis } from "rate-limiter-flexible";
import { getRedisPrefix, redisClient } from "./redis";

/**
 * Rate limiter for user actions (picks, commands, etc.).
 * Limit: 30 requests per minute per user.
 */
export const userActionLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: getRedisPrefix("rl-user-action"),
  points: 30,
  duration: 60,
  blockDuration: 0,
});
