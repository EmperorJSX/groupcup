import { type Context, Hono } from "hono";
import { webhookCallback } from "grammy";
import { trimTrailingSlash } from "hono/trailing-slash";
import { createMiddleware } from "hono/factory";
import chalk from "chalk";
import env from "@/config/env";
import healthApp from "./health";

// =====================================================
// APP CONFIGURATION
// =====================================================

const app = new Hono();
const apiApp = new Hono();

app.use(trimTrailingSlash({ alwaysRedirect: true }));

/**
 * Request logger middleware
 */
const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  const statusColor =
    status >= 500
      ? chalk.red
      : status >= 400
        ? chalk.yellow
        : status >= 300
          ? chalk.cyan
          : chalk.green;

  const tag = path.startsWith("/api/tg-bot") ? "[telegram]" : "[api]";

  console.log(
    `${chalk.dim(tag)} ${chalk.bold(method)} ${path} ${statusColor(status)} ${chalk.dim(`${duration}ms`)}`,
  );
});

if (env.IS_DEV) {
  apiApp.use("*", loggerMiddleware);
}

apiApp.onError((err, c) => {
  console.error("❌ Hono error:", err);
  return c.json({ success: false, message: "Internal Server Error" }, 500);
});

// =====================================================
// API ROUTES
// =====================================================

// Health (mounted at /api root)
apiApp.route("/", healthApp);

// Telegram bot webhook. Production receives updates here (TG_WEBHOOK_URL);
// in dev, run `bun run bot` for long polling instead. The bot is imported
// lazily so the Next app boots with zero config: only this handler needs
// TG_BOT_TOKEN, and grammy's webhookCallback also verifies the secret
// header and initializes the bot on first update.
let tgBotHandler: ((c: Context) => Promise<Response>) | undefined;

apiApp.post("/tg-bot", async (c) => {
  if (!tgBotHandler) {
    const { default: bot } = await import("@/bot/handler/register");
    tgBotHandler = webhookCallback(bot, "hono", {
      secretToken: env.TG_SECRET_TOKEN,
    });
  }
  return tgBotHandler(c);
});

app.route("/api", apiApp);

export default app;
