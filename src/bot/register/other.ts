import type { GrammyBotType } from "@/config/bot";
import {
  handleCallbackQuery,
  handleMyChatMember,
  handlePollAnswer,
  handleText,
} from "../handler/other";

const registerOther = (bot: GrammyBotType) => {
  // Group onboarding when the bot is added to a chat
  bot.on("my_chat_member", handleMyChatMember);

  // Prediction picks arrive as poll answers
  bot.on("poll_answer", handlePollAnswer);

  // Clear-the-spinner fallback for unregistered callback queries
  bot.on("callback_query:data", handleCallbackQuery);

  bot.on(":text", handleText);
};

export default registerOther;
