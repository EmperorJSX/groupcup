import type { MiddlewareFn } from "grammy";
import type Context from "@/bot/classes/Context";

export type BotHandler = MiddlewareFn<Context>;

/** Access checks supported by Bot.verifyMiddleware / createMiddleware. */
export type SupportedChecks = "owner" | "private" | "group" | "dev_only";

/**
 * Factory for access-controlled handlers. A plain check must pass (AND); an
 * array of checks passes if any of them does (OR).
 */
export type CreateMiddleware = (
  ...supportedChecks: (SupportedChecks | SupportedChecks[])[]
) => (handler: BotHandler) => BotHandler;
