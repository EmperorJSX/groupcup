import { BotState } from "@/bot/enum/BotState";

/** Telegram user id of the bot developer / owner. Swap for the real id. */
export const BOT_DEVELOPER_ID = 0;

/** Admin Telegram user ids who can run owner-only commands. */
export const BOT_ADMINS = new Set<number>([BOT_DEVELOPER_ID]);

/**
 * Scoring points. One prediction per match: correct outcome scores OUTCOME,
 * a correct exact score scores EXACT_SCORE (already includes the outcome).
 * Never inline these numbers.
 */
export const POINTS = {
  OUTCOME: 3,
  EXACT_SCORE: 5,
} as const;

/**
 * Error messages that are safe to ignore (not real failures).
 */
export const SAFE_ERROR_MESSAGES = [
  "query is too old",
  "message is not modified",
  "message to delete not found",
  "message to edit not found",
];

/** Error message when a user blocks the bot. */
export const USER_BLOCKED_BOT_ERROR = "bot was blocked by the user";

/** Default language when Telegram does not report one. */
export const DEFAULT_LANGUAGE = "en";

/** Separator used for command payload parsing. */
export const PAYLOAD_SEPARATOR = " ";

/** Separator used inside callback_query data, e.g. "pick:42:H". */
export const CALLBACK_SEPARATOR = ":";

// A base state, optionally scoped with a payload (e.g. "awaiting_score:<matchId>").
export type NewState = BotState | `${BotState}:${string}`;

/** Initial state for new conversations. */
export const DEFAULT_STATE = BotState.MENU;

export const MAX_EDIT_MESSAGE_RETRY = 3;
export const MESSAGE_TO_EDIT_NOT_FOUND_ERROR = "message to edit not found";
