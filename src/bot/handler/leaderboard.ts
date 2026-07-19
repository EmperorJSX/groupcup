import type { BotHandler } from "@/types/bot";
import type Context from "../classes/Context";
import Fmt from "../classes/Fmt";
import {
  getLeaderboard,
  getOrCreateGroup,
  type LeaderRow,
} from "../engine";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Renders leaderboard rows as an HTML message body.
 */
export function renderLeaderboard(
  rows: LeaderRow[],
  title = "Leaderboard",
): string {
  const builder = Fmt.emojiBuilder("trophyEmoji")
    .space()
    .add(Fmt.builder(title).escape().bold())
    .newLine(2);

  if (!rows.length) {
    return builder
      .add(
        Fmt.escape(
          "No points yet. Vote on the match polls to get on the board!",
        ),
      )
      .build();
  }

  for (const row of rows) {
    const medal = MEDALS[row.rank - 1] ?? `${row.rank}.`;
    const movement =
      row.delta > 0 ? ` 🔺${row.delta}` : row.delta < 0 ? ` 🔻${-row.delta}` : "";

    const name =
      row.rank <= 3
        ? Fmt.builder(row.name).escape().bold().build()
        : Fmt.escape(row.name);

    builder
      .add(medal)
      .space()
      .add(name)
      .add(Fmt.escape(` · ${row.points} pts${movement}`))
      .newLine();
  }

  return builder.build();
}

/**
 * Fetches and posts the current group's leaderboard.
 */
export async function showLeaderboard(ctx: Context): Promise<void> {
  const chat = ctx.chat!;
  const chatTitle = ("title" in chat ? chat.title : undefined) ?? undefined;
  const group = await getOrCreateGroup(String(chat.id), chatTitle ?? "group");

  const rows = await getLeaderboard(group.id);
  const title = chatTitle ? `${chatTitle} Leaderboard` : "Leaderboard";

  await ctx.replyWithHtml(renderLeaderboard(rows, title));
}

/**
 * "🏆 Leaderboard" inline button under live score updates.
 */
export const handleLeaderboardButton: BotHandler = async (ctx) => {
  await ctx.alert("", false);
  return showLeaderboard(ctx);
};
