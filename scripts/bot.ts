import bot from "@/config/bot";
import env from "@/config/env";
import chalk from "chalk";

/**
 * Bot CLI Commands
 * Usage: bun run scripts/bot.ts <command>
 */

const log = {
  success: (msg: string) => console.log(chalk.green(`✓ ${msg}`)),
  error: (msg: string) => console.error(chalk.red(`✗ ${msg}`)),
  info: (msg: string) => console.log(chalk.blue(`ℹ ${msg}`)),
};

/**
 * Logs the bot out from Telegram servers
 */
async function logOut(): Promise<void> {
  try {
    await bot.api.logOut();
    log.success("Bot logged out successfully");
  } catch (error) {
    log.error(`Failed to log out: ${error}`);
  } finally {
    process.exit(0);
  }
}

/**
 * Sets the webhook URL for receiving updates
 */
async function setWebhook(): Promise<void> {
  try {
    await bot.api.setWebhook(env.TG_WEBHOOK_URL, {
      secret_token: env.TG_SECRET_TOKEN,
      drop_pending_updates: true,
      allowed_updates: [
        "message",
        "callback_query",
        "my_chat_member",
        "poll_answer",
      ],
    });
    log.success(`Webhook set to ${env.TG_WEBHOOK_URL}`);
  } catch (error) {
    log.error(`Failed to set webhook: ${error}`);
  } finally {
    process.exit(0);
  }
}

/**
 * Deletes the current webhook
 */
async function deleteWebhook(): Promise<void> {
  try {
    await bot.api.deleteWebhook();
    log.success("Webhook deleted successfully");
  } catch (error) {
    log.error(`Failed to delete webhook: ${error}`);
  } finally {
    process.exit(0);
  }
}

/**
 * Sets the bot command menus for private and group chats
 */
async function setBotCommands(): Promise<void> {
  try {
    await bot.api.setMyCommands(
      [
        { command: "start", description: "🏆 Welcome and setup" },
        { command: "help", description: "📚 Show available commands" },
      ],
      { scope: { type: "all_private_chats" } },
    );
    await bot.api.setMyCommands(
      [
        { command: "matches", description: "⚽ Post the prediction polls" },
        { command: "leaderboard", description: "📊 Show the standings" },
        { command: "help", description: "📚 Show available commands" },
      ],
      { scope: { type: "all_group_chats" } },
    );
    log.success("Bot commands set for private and group chats");
  } catch (error) {
    log.error(`Failed to set commands: ${error}`);
  } finally {
    process.exit(0);
  }
}

/**
 * Gets current bot information
 */
async function getBotInfo(): Promise<void> {
  try {
    const info = await bot.api.getMe();
    log.info(`Bot: @${info.username} (${info.first_name})`);
    log.info(`ID: ${info.id}`);
    log.info(`Can join groups: ${info.can_join_groups}`);
    log.info(`Can read messages: ${info.can_read_all_group_messages}`);
  } catch (error) {
    log.error(`Failed to get bot info: ${error}`);
  } finally {
    process.exit(0);
  }
}

// Command mapping
const commands = {
  logout: logOut,
  setWebhook: setWebhook,
  deleteWebhook: deleteWebhook,
  setBotCommands: setBotCommands,
  info: getBotInfo,
} as const satisfies Record<string, () => Promise<void>>;

// Execute command
const command = process.argv[2] as keyof typeof commands;

if (!command) {
  console.log(chalk.yellow("\nAvailable commands:"));
  console.log("  logout         - Log out the bot from Telegram");
  console.log("  setWebhook     - Set the webhook URL");
  console.log("  deleteWebhook  - Delete the current webhook");
  console.log("  setBotCommands - Set the bot command menus");
  console.log("  info           - Get bot information\n");
  process.exit(0);
}

const handler = commands[command];
if (handler) {
  await handler();
} else {
  log.error(`Unknown command: ${command}`);
  process.exit(1);
}
