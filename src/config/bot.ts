import env from "./env";
import Context from "../bot/classes/Context";
import { type BotConfig, Bot as GrammyBot } from "grammy";

/**
 * The grammy bot instance. Only the bot entry points import this module
 * (src/bot/index.ts, scripts/bot.ts, and the webhook route, which imports it
 * lazily per request), so the Next landing boots with zero config.
 *
 * grammy initializes bot info lazily: bot.start() and webhookCallback both
 * call bot.init() themselves, so no init or Redis cache is needed here.
 */

if (!env.TG_BOT_TOKEN) {
  throw new Error(
    "TG_BOT_TOKEN is missing. Set it in .env (get one from @BotFather). " +
      "The landing (`bun run dev`) does not need it; `bun run bot` does.",
  );
}

const telegramBotConfig: BotConfig<Context> = {
  client: {
    apiRoot: env.TG_API_ROOT_URL,
  },

  ContextConstructor: Context,
};

export type GrammyBotType = GrammyBot<Context>;

/**
 * The main bot instance used throughout the application
 */
const bot = new GrammyBot<Context>(env.TG_BOT_TOKEN, telegramBotConfig);

export default bot;
