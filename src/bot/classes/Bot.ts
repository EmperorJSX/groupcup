import {
  BOT_ADMINS,
  DEFAULT_STATE,
  SAFE_ERROR_MESSAGES,
  USER_BLOCKED_BOT_ERROR,
} from "@/constants/bot";
import type Context from "./Context";
import env from "@/config/env";
import type { SupportedChecks } from "@/types/bot";
import Fmt from "./Fmt";
import { TeleError } from "./TeleError";

/**
 * Main bot class handling core functionality and interactions
 */
class Bot {
  /**
   * Renders the private-chat welcome with the add-to-group call to action
   */
  static async menu(ctx: Context) {
    const firstName = ctx.from?.first_name || "there";

    const message = Fmt.emojiBuilder("waveEmoji")
      .space()
      .add(Fmt.builder(`Welcome, ${firstName}!`).escape().bold())
      .newLine(2)
      .add(Fmt.emojiBuilder("trophyEmoji"))
      .space()
      .add(Fmt.builder("groupcup, the World Cup in your group chat").escape().bold())
      .newLine()
      .add(Fmt.escape("Predict matches, score points, crown a champion."))
      .newLine(2)
      .add(Fmt.emojiBuilder("soccerEmoji"))
      .space()
      .add(Fmt.escape("I post a prediction poll for every match"))
      .newLine()
      .add(Fmt.emojiBuilder("targetEmoji"))
      .space()
      .add(Fmt.escape("Tap your pick, it locks at kickoff"))
      .newLine()
      .add(Fmt.emojiBuilder("chartEmoji"))
      .space()
      .add(Fmt.escape("Live scores update the leaderboard as goals go in"))
      .newLine(2)
      .add(Fmt.emojiBuilder("speed"))
      .space()
      .add(Fmt.builder("Quick Start").escape().bold())
      .newLine()
      .add(Fmt.escape("Add me to your group chat and send /matches. Type /help for all commands."))
      .build();

    await ctx.replyWithHtml(message, {
      reply_markup: ctx
        .ikb()
        .url(
          "➕ Add me to your group",
          `https://t.me/${ctx.me.username}?startgroup=true`,
        ),
    });
  }

  /**
   * Handles the start command with an optional payload parameter
   */
  static async handleStartPayload({
    payload,
    ctx,
    defaultNext,
  }: {
    payload?: string | null;
    ctx: Context;
    defaultNext?: () => Promise<void>;
  }) {
    // Clear any existing state before processing a new command
    if (ctx.session.state !== DEFAULT_STATE) {
      await ctx.deleteState();
    }

    switch (payload) {
      case "menu":
        return Bot.menu(ctx);
    }

    // Fall back to default behavior if provided, otherwise show the menu
    if (defaultNext) return defaultNext();
    return Bot.menu(ctx);
  }

  /**
   * Checks if the user is in the hardcoded BOT_ADMINS list (no DB needed)
   */
  static isOwnerByAdminList(ctx: Context) {
    return BOT_ADMINS.has(ctx.from?.id ?? -1);
  }

  /**
   * Checks if the user has admin privileges
   */
  static isOwner(ctx: Context) {
    return Bot.isOwnerByAdminList(ctx);
  }

  /**
   * Verifies the context against security/permission requirements
   */
  static verifyMiddleware(
    ctx: Context,
    supportedChecks: SupportedChecks,
  ): boolean {
    switch (supportedChecks) {
      case "owner":
        return Bot.isOwner(ctx);
      case "private":
        return ctx.chat?.type === "private";
      case "group":
        return ctx.isGroupChat;
      case "dev_only":
        return env.IS_DEV;
      default:
        return false;
    }
  }

  /**
   * Centralized error handling with context awareness
   */
  static async handleError(error: unknown, ctx: Context): Promise<void> {
    if (error instanceof TeleError) {
      if (ctx.chat) await ctx.reply(error.message);
      return;
    }

    if (error instanceof Error) {
      const errorMessage = error.message;

      // Ignore known non-critical errors
      if (
        SAFE_ERROR_MESSAGES.some((message: string) =>
          errorMessage.includes(message),
        )
      ) {
        return;
      }

      // Special case: the user blocked the bot, nothing to deliver
      if (errorMessage.includes(USER_BLOCKED_BOT_ERROR)) {
        console.error("User blocked the bot");
        return;
      }
    }

    // ponytail: console-only, wire an error tracker (Sentry) at deploy time
    console.error(error);
  }
}

export default Bot;
