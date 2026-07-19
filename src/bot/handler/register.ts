// Import necessary modules and configurations
import bot from "@/config/bot";
import Bot from "../classes/Bot";
import registerAction from "../register/action";
import registerCommand from "../register/command";
import registerMiddleware from "../register/middleware";
import registerOther from "../register/other";

registerMiddleware(bot); // Register the middleware with the bot

registerCommand(bot); // Register the commands with the bot

registerAction(bot); // Register callback actions (before registerOther's fallback)

registerOther(bot); // Register other handlers with the bot

// Centralized error handling for both long polling and the webhook
bot.catch(({ error, ctx }) => Bot.handleError(error, ctx));

// Export the configured bot
export default bot;
