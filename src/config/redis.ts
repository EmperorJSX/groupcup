import Redis from "ioredis";
import env from "./env";

// Attach lifecycle logging to a Redis client.
const attachErrorHandlers = (client: Redis, name: string) => {
  client.on("error", (err) => {
    console.error(`[Redis:${name}] Connection error:`, err.message);
  });
  client.on("connect", () => {
    console.log(`[Redis:${name}] Connected`);
  });
  client.on("close", () => {
    console.warn(`[Redis:${name}] Connection closed`);
  });
  client.on("reconnecting", () => {
    console.log(`[Redis:${name}] Reconnecting...`);
  });
  return client;
};

// Main shared Redis client. lazyConnect keeps module import side-effect
// free: the connection opens on first command, so the Next app can load
// routes that import this module without a Redis server running.
export const redisClient = attachErrorHandlers(
  new Redis(env.REDIS_URL, { lazyConnect: true }),
  "main",
);

const appName = env.APP_NAME + (env.IS_DEV ? ":development" : ":production");

/** Namespaced Redis key prefix, e.g. "groupcup:development:<path>". */
export const getRedisPrefix = (path: string) => {
  return `${appName}:${path}`;
};

export default redisClient;
