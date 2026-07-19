import type { BotHandler } from "@/types/bot";
import Fmt from "../classes/Fmt";
import {
  getOrCreateGroup,
  getOrCreateUser,
  upsertPrediction,
} from "../engine";
import {
  isMatchLocked,
  loadPollRef,
  PICK_OPTIONS,
} from "./matches";

const ACTIVE_MEMBER_STATUSES = new Set(["member", "administrator"]);

/**
 * Group onboarding: when the bot is added to a group chat, register the
 * group with the engine and post the welcome.
 */
export const handleMyChatMember: BotHandler = async (ctx) => {
  const update = ctx.myChatMember;
  if (!update) return;

  const { chat } = update;
  if (chat.type !== "group" && chat.type !== "supergroup") return;

  const wasIn = ACTIVE_MEMBER_STATUSES.has(update.old_chat_member.status);
  const isIn = ACTIVE_MEMBER_STATUSES.has(update.new_chat_member.status);
  if (wasIn || !isIn) return;

  await getOrCreateGroup(String(chat.id), chat.title ?? "group");

  const message = Fmt.emojiBuilder("trophyEmoji")
    .space()
    .add(Fmt.builder("groupcup has entered the chat!").escape().bold())
    .newLine(2)
    .add(
      Fmt.escape(
        "Your group's World Cup prediction league starts now. Here's how it works:",
      ),
    )
    .newLine(2)
    .add(Fmt.emojiBuilder("soccerEmoji"))
    .space()
    .add(Fmt.escape("I post a prediction poll for every match"))
    .newLine()
    .add(Fmt.emojiBuilder("lockEmoji"))
    .space()
    .add(Fmt.escape("Picks lock at kickoff, no late calls"))
    .newLine()
    .add(Fmt.emojiBuilder("chartEmoji"))
    .space()
    .add(Fmt.escape("Goals roll in live and the leaderboard updates"))
    .newLine()
    .add(Fmt.emojiBuilder("crownEmoji"))
    .space()
    .add(Fmt.escape("Top of the table takes the cup"))
    .newLine(2)
    .add(Fmt.builder("Send /matches to post the first polls!").escape().bold())
    .build();

  await ctx.api.sendMessage(chat.id, message, { parse_mode: "HTML" });
};

/**
 * Records a prediction when a user votes on a match poll.
 * Ignores votes for unknown polls and matches already locked at kickoff.
 */
export const handlePollAnswer: BotHandler = async (ctx) => {
  const answer = ctx.pollAnswer;
  if (!answer) return;

  // Anonymous channel votes carry no user, nothing to score
  const voter = answer.user;
  if (!voter || voter.is_bot) return;

  const ref = await loadPollRef(answer.poll_id);
  if (!ref) return;

  if (await isMatchLocked(ref.matchId)) return;

  // An empty option list is a retracted vote; the last pick stands
  const optionIndex = answer.option_ids[0];
  if (optionIndex === undefined) return;

  const pick = PICK_OPTIONS[optionIndex];
  if (!pick) return;

  const name =
    [voter.first_name, voter.last_name].filter(Boolean).join(" ") ||
    voter.username ||
    "player";
  const user = await getOrCreateUser(String(voter.id), name);

  await upsertPrediction(ref.groupId, user.id, ref.matchId, pick);
};

/**
 * Handles plain text messages. Groups stay quiet (the bot only reacts to
 * commands and polls there); private chats get a gentle hint.
 */
export const handleText: BotHandler = async (ctx) => {
  if (ctx.chat?.type !== "private") return;

  const text = ctx.message?.text?.trim();
  if (!text) return;

  const msg = Fmt.emojiBuilder("infoEmoji")
    .space()
    .add(
      Fmt.escape(
        "Add me to a group chat to start your prediction league, or type",
      ),
    )
    .space()
    .add("/help")
    .add(Fmt.escape("."))
    .build();

  return void (await ctx.replyWithHtml(msg));
};

/**
 * Fallback for callback queries with no specific registration,
 * just clears the button's loading spinner.
 */
export const handleCallbackQuery: BotHandler = async (ctx) => {
  return ctx.alert("", false);
};
