import Bot from "../classes/Bot";
import Fmt from "../classes/Fmt";
import type { BotHandler, CreateMiddleware } from "@/types/bot";
import { userActionLimiter } from "@/config/rate-limiter";
import { RateLimiterRes } from "rate-limiter-flexible";

/**
 * Prevents bot accounts from interacting with the bot.
 * Continues execution only if the sender is a human account.
 */
export const noBotAllowed: BotHandler = async (ctx, next) => {
  if (!ctx.from?.is_bot) {
    return next();
  }
};

/**
 * Wraps handlers in a try-catch block to prevent crashes.
 * Errors are captured and passed to the error handling system
 * while allowing the bot to continue functioning.
 */
export const makeNonBlocking: BotHandler = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    return Bot.handleError(error, ctx);
  }
};

/**
 * Prepares the context object with session state and the engine user record
 * before passing it to subsequent handlers.
 */
export const prepareContext: BotHandler = async (ctx, next) => {
  // Skip processing if no user information is available
  if (!ctx.from) return;

  await Promise.all([ctx.setState(), ctx.addUserToContext()]);

  return next();
};

/**
 * Factory that creates middleware with configurable access control.
 * A plain check must pass (AND); an array of checks passes if any of them
 * does (OR). Failing checks skip the handler and fall through to the next.
 */
export const createMiddleware: CreateMiddleware = (...supportedChecks) => {
  return (handler) => async (ctx, next) => {
    const passesAllChecks = supportedChecks.every((checkItem) =>
      Array.isArray(checkItem)
        ? checkItem.some((singleCheck) =>
            Bot.verifyMiddleware(ctx, singleCheck),
          )
        : Bot.verifyMiddleware(ctx, checkItem),
    );

    if (passesAllChecks) {
      return handler(ctx, next);
    } else {
      return next();
    }
  };
};

/**
 * Per-user rate limiting backed by Redis. 30 actions per minute.
 */
export const rateLimiterMiddleware: BotHandler = async (ctx, next) => {
  try {
    await userActionLimiter.consume(ctx.userId);
    return next();
  } catch (rateLimiterRes) {
    // A non-RateLimiterRes rejection means Redis hiccuped, not the user
    if (!(rateLimiterRes instanceof RateLimiterRes)) {
      console.error("Rate limiter error:", rateLimiterRes);
      return next();
    }

    // Updates without a chat (poll answers) cannot be replied to
    if (!ctx.chat) return;

    const retryAfterSeconds = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

    const msg = Fmt.emojiBuilder("pendingEmoji")
      .space()
      .add(Fmt.builder("Rate limited").escape().bold())
      .newLine()
      .add(
        Fmt.escape(`Please wait ${retryAfterSeconds}s before trying again`),
      )
      .build();

    return ctx.replyWithHtml(msg);
  }
};
