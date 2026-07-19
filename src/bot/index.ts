import bot from "./handler/register";
import { startLiveScoreFeed } from "./live";

/**
 * Long-polling runner for development (`bun run bot`).
 * Production receives updates via the Hono webhook instead
 * (`POST /api/tg-bot`), point TG_WEBHOOK_URL there and register it with
 * `bun run set-webhook`.
 */

// Polling conflicts with an active webhook, clear it first.
await bot.api.deleteWebhook();

// Score events flow into the group chats while the runner is alive
startLiveScoreFeed(bot);

await bot.start({
  allowed_updates: ["message", "callback_query", "my_chat_member", "poll_answer"],
  onStart: (me) => console.log(`🤖 @${me.username} running (long polling)`),
});
