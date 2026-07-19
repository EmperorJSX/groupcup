import type { GrammyBotType } from "@/config/bot";
import { handleLeaderboardButton } from "../handler/leaderboard";

/**
 * Registers all action (callback_query) handlers with the bot.
 * Must be registered BEFORE registerOther, whose callback_query:data
 * fallback would swallow these otherwise.
 */
const registerAction = (bot: GrammyBotType) => {
  // "🏆 Full leaderboard" button under live score updates
  bot.callbackQuery("leaderboard", handleLeaderboardButton);
};

export default registerAction;
