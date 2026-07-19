/**
 * Error type whose message is safe to show to the Telegram user.
 * Bot.handleError replies with the message instead of logging a stack.
 */
export class TeleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeleError";
  }
}
