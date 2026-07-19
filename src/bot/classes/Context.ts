import {
  Context as GrammyContext,
  InlineKeyboard,
  Keyboard,
  type Api,
  type RawApi,
} from "grammy";
import type {
  Message,
  Update,
  UserFromGetMe,
  InlineKeyboardButton,
} from "grammy/types";
import ms from "ms";
import {
  DEFAULT_STATE,
  MAX_EDIT_MESSAGE_RETRY,
  MESSAGE_TO_EDIT_NOT_FOUND_ERROR,
  PAYLOAD_SEPARATOR,
  type NewState,
} from "@/constants/bot";
import Session from "./Session";
import { type FmtString } from "./Fmt";
import Bot from "./Bot";
import { getOrCreateUser, type EngineUser } from "../engine";

/**
 * Checks if a unix timestamp (seconds) is within the last 48 hours,
 * the window in which Telegram allows message deletion.
 */
function isWithinLast48Hours(timestamp: number): boolean {
  return Date.now() / 1000 - timestamp < 48 * 3600;
}

/**
 * Extended context class for grammy that adds custom functionality
 * for session management, state handling, and user operations
 */
export default class Context extends GrammyContext {
  /** Stores data that needs to be transferred across different handlers */
  public transferData: Record<string, unknown> = {};

  /** Session handler for maintaining conversation state */
  public session: Session;

  /** Current user's engine record, loaded by prepareContext middleware */
  public user: EngineUser | null = null;

  /** User's Telegram id as a string */
  public userId: string;

  /** Flag indicating whether the current user has admin privileges */
  public isOwner: boolean;

  /** Command payload parameters (text after the command) */
  public payload: string | null;

  /** Id of the current message being processed */
  public currentMessageId: number | undefined;

  /** Counter for message edit retry attempts */
  public retryCount = 0;

  /** Bot info from the parent class */
  declare public readonly me: UserFromGetMe;

  constructor(update: Update, api: Api<RawApi>, me: UserFromGetMe) {
    super(update, api, me);
    this.session = new Session(this);
    this.isOwner = Bot.isOwnerByAdminList(this);
    this.payload = this.extractCommandPayload();
    this.currentMessageId = this.msgId;
    this.userId = this.from?.id.toString() || "";
  }

  /**
   * True when the update comes from a group or supergroup chat
   */
  get isGroupChat(): boolean {
    return this.chat?.type === "group" || this.chat?.type === "supergroup";
  }

  /**
   * Creates a new keyboard instance for reply markup
   */
  keyboard(): Keyboard {
    return new Keyboard();
  }

  /** Alias for keyboard method */
  kb = this.keyboard;

  /**
   * Creates a new inline keyboard instance for message markup
   */
  inlineKeyboard(): InlineKeyboard {
    return new InlineKeyboard();
  }

  /** Alias for inlineKeyboard method */
  ikb = this.inlineKeyboard;

  /**
   * Sends a reply using HTML formatting
   */
  async replyWithHtml(
    text: string,
    options?: {
      reply_markup?: InlineKeyboard;
      reply_to_message_id?: number;
      link_preview_options?: { is_disabled?: boolean };
    },
  ): Promise<Message.TextMessage> {
    return this.reply(text, {
      parse_mode: "HTML",
      ...options,
    });
  }

  /**
   * Sends a message to the current chat
   */
  async sendMessage(
    text: string,
    options?: {
      parse_mode?: "HTML";
      reply_markup?: InlineKeyboard;
      link_preview_options?: { is_disabled?: boolean };
    },
  ): Promise<Message.TextMessage> {
    return this.reply(text, options);
  }

  /**
   * Deletes the current message if possible
   */
  async deleteCurrentMessage(): Promise<boolean> {
    try {
      const message = this.message || this.callbackQuery?.message;
      const timestamp = message?.date;

      // Only attempt deletion if the message is recent (within 48 hours)
      if (timestamp && isWithinLast48Hours(timestamp)) {
        await this.deleteMessage();
      } else {
        // If the message is too old, clear the button spinner instead
        await this.alert("");
      }
      return true;
    } catch (error) {
      console.error("Context.deleteCurrentMessage error:", error);
      return false;
    }
  }

  /**
   * Edits an existing message with fallback to a new message if needed
   */
  async editMessage(
    text: string | FmtString,
    options?: {
      parse_mode?: "HTML";
      reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
      link_preview_options?: { is_disabled?: boolean };
    },
  ) {
    const messageText = typeof text === "string" ? text : text.text;
    const parseMode =
      typeof text === "string" ? options?.parse_mode : text.parse_mode;

    try {
      return await this.api.editMessageText(
        this.chat!.id,
        this.currentMessageId!,
        messageText,
        {
          ...options,
          parse_mode: parseMode,
        },
      );
    } catch (error) {
      // Handle the case where the original message was deleted
      const isMessageDeletedError =
        this.retryCount <= MAX_EDIT_MESSAGE_RETRY &&
        error instanceof Error &&
        error.message.toLowerCase().includes(MESSAGE_TO_EDIT_NOT_FOUND_ERROR);

      if (isMessageDeletedError) {
        this.retryCount++;

        // Send as a new message instead of an edit
        const newMessage = await this.reply(messageText, {
          ...options,
          parse_mode: parseMode,
        });
        this.currentMessageId = newMessage.message_id;
        return newMessage;
      }

      throw error;
    }
  }

  /**
   * Edits a message with default formatting and preview options
   */
  async editMessageDefault(
    message: string | FmtString,
    inlineKeyboardButtons: InlineKeyboardButton[][] = [],
  ) {
    return this.editMessage(message, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
      reply_markup: { inline_keyboard: inlineKeyboardButtons },
    });
  }

  /**
   * Extracts the payload from a command message
   */
  extractCommandPayload(): string | null {
    try {
      const messageText = (this.message as Message.TextMessage)?.text;
      if (!messageText) return null;

      const messageSegments = messageText.split(PAYLOAD_SEPARATOR);

      // Remove the command part
      messageSegments.shift();

      return messageSegments?.join(PAYLOAD_SEPARATOR).trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Shows an alert message to the user (for callback queries)
   */
  async alert(alertMessage: string, showAsPopup = true) {
    if (!this.callbackQuery) return;

    // Ignore errors here; a stale callback must not block the bot
    return this.answerCallbackQuery({
      text: alertMessage || undefined,
      show_alert: showAsPopup,
    }).catch();
  }

  /**
   * Updates the conversation state
   */
  async changeState(newState: NewState): Promise<void> {
    await this.session
      .set("state", {
        value: newState,
        ttlMs: ms("7d"),
      })
      .then(() => {
        this.session.state = newState;
      });
  }

  /**
   * Loads the conversation state from the session
   */
  async setState(): Promise<void> {
    const savedState = await this.session.get("state");
    if (savedState) {
      this.session.state = savedState as NewState;
    }
  }

  /**
   * Clears the conversation state
   */
  async deleteState(): Promise<void> {
    if (this.session.state === DEFAULT_STATE) return;
    await this.session.delete("state");
    this.session.state = DEFAULT_STATE;
  }

  /**
   * Best display name for the sender (first + last name, or username)
   */
  get displayName(): string {
    const { first_name, last_name, username } = this.from ?? {};
    const fullName = [first_name, last_name].filter(Boolean).join(" ");
    return fullName || username || "player";
  }

  /**
   * Loads or creates the engine user record and adds it to the context
   */
  async addUserToContext(): Promise<void> {
    // Skip for bots or when sender info is missing
    if (!this.from || this.from.is_bot) return;

    this.user = await getOrCreateUser(this.userId, this.displayName);
  }
}
