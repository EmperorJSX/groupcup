import { InlineKeyboard } from "grammy";
import type { GrammyBotType } from "@/config/bot";
import Fmt from "./classes/Fmt";
import {
  getLeaderboard,
  onScoreEvent,
  recomputeLeaderboard,
  type LeaderRow,
  type ScoreEvent,
} from "./engine";
import {
  closeMatchPredictions,
  loadMatchPollRefs,
  type PollRef,
} from "./handler/matches";
import { renderLeaderboard } from "./handler/leaderboard";

/** Final-whistle marker per the engine contract. */
const FINAL_EVENT = "game_finalised";

/**
 * Subscribes to the txline score feed and turns events into group chat
 * updates: lock polls on the first event, then post the score and the
 * live leaderboard. Started by the long-poll runner (`bun run bot`).
 */
export function startLiveScoreFeed(bot: GrammyBotType): void {
  onScoreEvent(async (event) => {
    try {
      await broadcastScoreEvent(bot, event);
    } catch (error) {
      console.error("Live score feed error:", error);
    }
  });
  console.log("📡 txline live score feed connected");
}

async function broadcastScoreEvent(
  bot: GrammyBotType,
  event: ScoreEvent,
): Promise<void> {
  // Events without a resolvable db match id cannot be routed to a chat
  if (event.matchId == null) return;

  const refs = await loadMatchPollRefs(event.matchId);
  if (!refs.length) return;

  // First event for this match: the ball is rolling, close predictions
  await closeMatchPredictions(bot.api, event.matchId);

  const isFinal = event.type === FINAL_EVENT;

  for (const ref of refs) {
    try {
      await recomputeLeaderboard(ref.groupId);
      const rows = await getLeaderboard(ref.groupId);

      await bot.api.sendMessage(
        ref.chatId,
        buildScoreMessage(ref, event, rows, isFinal),
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().text(
            "🏆 Full leaderboard",
            "leaderboard",
          ),
        },
      );
    } catch (error) {
      console.error(`Live update failed for chat ${ref.chatId}:`, error);
    }
  }
}

function buildScoreMessage(
  ref: PollRef,
  event: ScoreEvent,
  rows: LeaderRow[],
  isFinal: boolean,
): string {
  const minute = event.minute != null ? ` ${event.minute}'` : "";
  const headline = isFinal ? "📣 FULL TIME" : `⚽ GOAL!${minute}`;

  const scoreLine = Fmt.builder(`${ref.homeFlag} `)
    .add(Fmt.escape(ref.home))
    .space()
    .add(Fmt.bold(`${event.homeScore} : ${event.awayScore}`))
    .space()
    .add(Fmt.escape(ref.away))
    .add(` ${ref.awayFlag}`);

  const builder = Fmt.builder(Fmt.bold(headline))
    .newLine()
    .add(scoreLine)
    .newLine(2)
    .addQuote(renderLeaderboard(rows, "Live standings"));

  const champion = rows[0];
  if (isFinal && champion) {
    builder
      .newLine(2)
      .add(Fmt.emojiBuilder("crownEmoji"))
      .space()
      .add(Fmt.builder(champion.name).escape().bold())
      .space()
      .add(Fmt.escape(`leads the pack with ${champion.points} pts!`));
  }

  return builder.build();
}
