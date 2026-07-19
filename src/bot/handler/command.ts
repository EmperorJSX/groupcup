import type { BotHandler } from "@/types/bot";
import Bot from "../classes/Bot";
import Fmt from "../classes/Fmt";
import { getOrCreateGroup } from "../engine";
import { postMatchPolls } from "./matches";
import { showLeaderboard } from "./leaderboard";

/**
 * Wraps a handler so it only runs in group chats; elsewhere it replies with
 * a hint instead of silently ignoring the command.
 */
const groupOnly =
  (handler: (ctx: Parameters<BotHandler>[0]) => Promise<void>): BotHandler =>
  async (ctx) => {
    if (ctx.isGroupChat) return handler(ctx);

    const hint = Fmt.emojiBuilder("infoEmoji")
      .space()
      .add(
        Fmt.escape(
          "This command works in group chats. Add me to your group first!",
        ),
      )
      .build();

    await ctx.replyWithHtml(hint, {
      reply_markup: ctx
        .ikb()
        .url(
          "➕ Add me to your group",
          `https://t.me/${ctx.me.username}?startgroup=true`,
        ),
    });
  };

/**
 * Handles the /start command. In private chats it shows the welcome menu;
 * in groups it onboards the chat into the game.
 */
export const start: BotHandler = async (ctx) => {
  if (ctx.isGroupChat) {
    const chat = ctx.chat!;
    await getOrCreateGroup(
      String(chat.id),
      ("title" in chat ? chat.title : undefined) ?? "group",
    );

    const message = Fmt.emojiBuilder("trophyEmoji")
      .space()
      .add(Fmt.builder("groupcup is on!").escape().bold())
      .newLine(2)
      .add(Fmt.emojiBuilder("soccerEmoji"))
      .space()
      .add(Fmt.escape("Send /matches to post the prediction polls."))
      .newLine()
      .add(Fmt.emojiBuilder("chartEmoji"))
      .space()
      .add(Fmt.escape("Send /leaderboard to see the standings."))
      .build();

    return void (await ctx.replyWithHtml(message));
  }

  if (ctx.chat?.type !== "private") return;

  return Bot.handleStartPayload({ payload: ctx.payload, ctx });
};

/**
 * Posts a prediction poll for every open match into the group
 */
export const matches: BotHandler = groupOnly(postMatchPolls);

/**
 * Shows the group's leaderboard
 */
export const leaderboard: BotHandler = groupOnly(showLeaderboard);

/**
 * Command definitions for the help message.
 */
const commandDefinitions: Record<string, string> = {
  start: "Welcome and setup",
  matches: "Post a prediction poll for every open match (groups)",
  leaderboard: "Show the group standings (groups)",
  help: "Show this help message",
};

/**
 * Provides users with help information
 */
export const help: BotHandler = async (ctx) => {
  const builder = Fmt.emojiBuilder("bookEmoji")
    .space()
    .add(Fmt.builder("Available Commands").escape().bold())
    .newLine(2);

  for (const [command, description] of Object.entries(commandDefinitions)) {
    builder
      .add(`/${command}`)
      .newLine()
      .space(2)
      .add(Fmt.escape(description))
      .newLine(2);
  }

  builder
    .add(Fmt.emojiBuilder("soccerEmoji"))
    .space()
    .add(
      Fmt.escape(
        "Vote on the match polls to make your predictions. They lock at kickoff!",
      ),
    );

  return void (await ctx.replyWithHtml(builder.build()));
};
