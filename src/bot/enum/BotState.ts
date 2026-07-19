/**
 * Conversation states for the bot's private-chat flows. Group prediction picks
 * are stateless callback buttons, so most game flow needs no state at all.
 */
export enum BotState {
  MENU = "menu",
  /** Waiting for an exact-score guess, scoped as "awaiting_score:<matchId>". */
  AWAITING_SCORE = "awaiting_score",
}
