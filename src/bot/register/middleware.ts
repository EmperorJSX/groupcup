import type { GrammyBotType } from "@/config/bot";
import {
  makeNonBlocking,
  noBotAllowed,
  prepareContext,
  rateLimiterMiddleware,
} from "../handler/middleware";

/**
 * Registers all middleware for the bot in the correct order
 */
const registerMiddleware = (bot: GrammyBotType) => {
  // Filter out bot accounts
  bot.use(noBotAllowed);

  bot.use(rateLimiterMiddleware);

  // Initialize context with session state and the engine user
  bot.use(prepareContext);

  bot.use(makeNonBlocking);
};

export default registerMiddleware;
