import ms from "ms";
import redis, { getRedisPrefix } from "@/config/redis";
import type Context from "../classes/Context";
import Fmt from "../classes/Fmt";
import {
  getOrCreateGroup,
  hasKickedOff,
  kickoffMs,
  listOpenMatches,
  type Match,
} from "../engine";
import { flagFor } from "@/constants/teams";

/**
 * Prediction polls: one native Telegram poll per match, per group chat.
 * The poll id is the only thing a poll_answer update carries, so every
 * posted poll is recorded in Redis:
 *
 * - poll:<pollId>            -> PollRef   (poll_answer lookup)
 * - match:<matchId>:polls    -> hash chatId -> PollRef (lock + broadcast)
 * - match:<matchId>:locked   -> "1" once predictions are closed
 */

export interface PollRef {
  pollId: string;
  matchId: number;
  chatId: number;
  groupId: number;
  messageId: number;
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
}

/** Poll answer option order: index 0 home win, 1 draw, 2 away win. */
export const PICK_OPTIONS = ["home", "draw", "away"] as const;

// Refs outlive the tournament comfortably; Redis is not the system of record.
const POLL_REF_TTL_MS = ms("60d");

const pollKey = (pollId: string) => getRedisPrefix(`poll:${pollId}`);
const matchPollsKey = (matchId: number) =>
  getRedisPrefix(`match:${matchId}:polls`);
const matchLockKey = (matchId: number) =>
  getRedisPrefix(`match:${matchId}:locked`);

/** Persists a posted poll so answers and score events can find it. */
export async function savePollRef(ref: PollRef): Promise<void> {
  const json = JSON.stringify(ref);
  await redis
    .pipeline([
      ["set", pollKey(ref.pollId), json, "PX", String(POLL_REF_TTL_MS)],
      ["hset", matchPollsKey(ref.matchId), String(ref.chatId), json],
      ["pexpire", matchPollsKey(ref.matchId), String(POLL_REF_TTL_MS)],
    ])
    .exec();
}

/** Looks up the poll a poll_answer update refers to. */
export async function loadPollRef(pollId: string): Promise<PollRef | null> {
  const json = await redis.get(pollKey(pollId));
  return json ? (JSON.parse(json) as PollRef) : null;
}

/** All polls posted for a match, across every group chat. */
export async function loadMatchPollRefs(matchId: number): Promise<PollRef[]> {
  const entries = await redis.hgetall(matchPollsKey(matchId));
  return Object.values(entries).map((json) => JSON.parse(json) as PollRef);
}

/** True once predictions for the match are closed. */
export async function isMatchLocked(matchId: number): Promise<boolean> {
  return (await redis.exists(matchLockKey(matchId))) > 0;
}

/** Marks predictions for the match as closed. */
export async function markMatchLocked(matchId: number): Promise<void> {
  await redis.set(matchLockKey(matchId), "1", "PX", POLL_REF_TTL_MS);
}

/** "Sun, 14 Jun 2026 18:00 UTC" from any kickoff shape. */
export function formatKickoff(match: Pick<Match, "kickoff">): string {
  return new Date(kickoffMs(match))
    .toUTCString()
    .replace(/:\d{2} GMT$/, " UTC");
}

/**
 * Posts one prediction poll per open match into the current group chat.
 * Skips matches that already have a poll here and ones already kicked off.
 */
export async function postMatchPolls(ctx: Context): Promise<void> {
  const chat = ctx.chat!;
  const group = await getOrCreateGroup(
    String(chat.id),
    ("title" in chat ? chat.title : undefined) ?? "group",
  );

  const matches = await listOpenMatches();
  const open = matches.filter((match) => !hasKickedOff(match));

  let posted = 0;
  for (const match of open) {
    const alreadyPosted = await redis.hexists(
      matchPollsKey(match.id),
      String(chat.id),
    );
    if (alreadyPosted) continue;

    const homeFlag = flagFor(match.home, match.homeFlag);
    const awayFlag = flagFor(match.away, match.awayFlag);

    // Poll questions and options are plain text, no HTML parse mode there
    const question =
      `${homeFlag} ${match.home} vs ${match.away} ${awayFlag}\n` +
      `⏰ ${formatKickoff(match)} · Who wins?`;

    const poll = await ctx.api.sendPoll(chat.id, question, [
      `${homeFlag} ${match.home}`,
      `🤝 Draw`,
      `${awayFlag} ${match.away}`,
    ], {
      is_anonymous: false,
      allows_multiple_answers: false,
    });

    await savePollRef({
      pollId: poll.poll.id,
      matchId: match.id,
      chatId: chat.id,
      groupId: group.id,
      messageId: poll.message_id,
      home: match.home,
      away: match.away,
      homeFlag,
      awayFlag,
    });
    posted++;
  }

  if (posted > 0) {
    const message = Fmt.emojiBuilder("soccerEmoji")
      .space()
      .add(Fmt.builder(`${posted} prediction poll${posted === 1 ? "" : "s"} posted!`).escape().bold())
      .newLine()
      .add(Fmt.escape("Tap your pick. Predictions lock at kickoff."))
      .newLine()
      .add(Fmt.escape("Correct outcome scores points, /leaderboard shows the standings."))
      .build();
    await ctx.replyWithHtml(message);
  } else if (open.length > 0) {
    await ctx.replyWithHtml(
      Fmt.emojiBuilder("successEmoji")
        .space()
        .add(Fmt.escape("All open matches already have polls here. Vote away!"))
        .build(),
    );
  } else {
    await ctx.replyWithHtml(
      Fmt.emojiBuilder("pendingEmoji")
        .space()
        .add(Fmt.escape("No open matches right now. Check back before the next kickoff."))
        .build(),
    );
  }
}
