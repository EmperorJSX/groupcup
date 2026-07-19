import type { GrammyBotType } from "@/config/bot";

import * as commands from "../handler/command";

import { toSnakeCase } from "@/utils/helper";

/**
 * Registers every export of handler/command.ts as a bot command,
 * deriving the command name from the export name.
 */
const registerCommand = (bot: GrammyBotType) => {
  for (const [command, handler] of Object.entries(commands)) {
    bot.command(toSnakeCase(command), handler);
  }
};

export default registerCommand;
