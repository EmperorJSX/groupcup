/**
 * Telegram message formatter for parse_mode HTML.
 *
 * Adapted from jomo's MarkdownV2 builder. Only three characters need
 * escaping in HTML mode (& < >), so all of the MarkdownV2 char-list
 * machinery (escapeOnly, escapeAllExcept, unbold) is gone. Supported tags:
 * <b> <i> <u> <s> <code> <a> <blockquote>.
 *
 * Usage guidelines:
 * - Always escape text before injecting any user input into the template.
 * - Escape before styling: bold()/italic()/... wrap without escaping.
 *
 * @example
 * const message = Fmt.emojiBuilder("trophyEmoji")
 *   .space()
 *   .add(Fmt.builder("Leaderboard").escape().bold())
 *   .newLine(2)
 *   .add(Fmt.field("⚽", "Match", "Brazil vs Argentina"))
 *   .build();
 */

import { html as formatter } from "telegram-format";
import { emojis, type SupportedEmojis } from "@/constants/emoji";

export type FmtString = {
  text: string;
  parse_mode: typeof formatter.parse_mode;
};

/**
 * Simple placeholder compiler, replaces %{key} with values from a data object
 */
function compilePlaceholders(
  text: string,
  data: Record<string, string | number | undefined>,
): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(
      new RegExp(`%\\{${key}\\}`, "g"),
      String(value ?? ""),
    );
  }
  return result;
}

/**
 * Builder for properly formatted Telegram HTML messages.
 */
class Fmt {
  private formattedText: string;

  /**
   * Creates a new formatter instance with optional initial text
   */
  constructor(initialText: string | number = "") {
    this.formattedText = String(initialText);
  }

  /**
   * Factory method to create a new formatter instance
   */
  static builder(initialText: string | number = ""): Fmt {
    return new Fmt(initialText);
  }

  /**
   * Creates a formatter instance starting with an emoji
   */
  static emojiBuilder(emojiKey: SupportedEmojis): Fmt {
    return Fmt.builder(emojis[emojiKey]);
  }

  /**
   * Prepends text or another formatter's content to this formatter
   */
  public prepend(content: string | number | Fmt, separator = " "): Fmt {
    if (content instanceof Fmt) {
      content = content.build();
    }
    this.formattedText = String(content) + separator + this.formattedText;
    return this;
  }

  /**
   * Appends text or another formatter's content to this formatter
   */
  public add(content: string | number | Fmt): Fmt {
    if (content instanceof Fmt) {
      this.formattedText += content.build();
    } else {
      this.formattedText += content;
    }
    return this;
  }

  /**
   * Creates a string with the specified number of newlines
   */
  static newLine(count: number = 1): string {
    return "\n".repeat(count);
  }

  /**
   * Adds newlines to the current formatter
   */
  public newLine(count: number = 1): Fmt {
    return this.add("\n".repeat(count));
  }

  /**
   * Adds spaces to the current formatter
   */
  public space(count: number = 1): Fmt {
    return this.add(" ".repeat(count));
  }

  /**
   * Formats text as a table row with a colon separator
   */
  public table(text: string, preText = ""): Fmt {
    return this.add(`: ${preText}${text}`);
  }

  /**
   * Formats text as a table row with a bold colon separator
   */
  public tableBold(text: string | Fmt, preText = " "): Fmt {
    if (text instanceof Fmt) {
      text = text.build();
    }
    return this.add(":").bold().add(`${preText}${text}`);
  }

  /**
   * Makes the current text bold
   */
  public bold(): Fmt {
    this.formattedText = formatter.bold(this.formattedText);
    return this;
  }

  /**
   * Static helper to create bold text with proper escaping
   */
  static bold(text: string | number): string {
    return this.builder(text).escape().bold().build();
  }

  /**
   * Makes the current text italic
   */
  public italic(): Fmt {
    this.formattedText = formatter.italic(this.formattedText);
    return this;
  }

  /**
   * Static helper to create italic text with proper escaping
   */
  static italic(text: string | number): string {
    return this.builder(text).escape().italic().build();
  }

  /**
   * Underlines the current text
   */
  public underline(): Fmt {
    this.formattedText = formatter.underline(this.formattedText);
    return this;
  }

  /**
   * Strikes through the current text
   */
  public strikethrough(): Fmt {
    this.formattedText = formatter.strikethrough(this.formattedText);
    return this;
  }

  /**
   * Makes the current text a spoiler
   */
  public spoiler(): Fmt {
    this.formattedText = formatter.spoiler(this.formattedText);
    return this;
  }

  /**
   * Makes the current text monospace (code style). telegram-format escapes
   * the inner text itself here, so no prior escape() is needed.
   */
  public monospace(): Fmt {
    this.formattedText = formatter.monospace(this.formattedText);
    return this;
  }

  /**
   * Static helper for monospace text
   */
  static monospace(text: string | number): string {
    return this.builder(text).monospace().build();
  }

  /**
   * Escapes the three HTML special characters (& < >) in the text
   */
  public escapeAll(): Fmt {
    this.formattedText = formatter.escape(this.formattedText);
    return this;
  }

  /** Alias for escapeAll */
  public escape = this.escapeAll;

  /**
   * Static helper to escape the three HTML special characters
   */
  static escape(text: string | number): string {
    return formatter.escape(String(text));
  }

  /**
   * Finalizes and returns the formatted text
   */
  public build(): string {
    return this.formattedText;
  }

  /**
   * Alias for build method to support string conversion
   */
  public toString = this.build;

  /**
   * Converts the formatter to a format suitable for the Telegram API
   */
  public toFmtString(): FmtString {
    return {
      text: this.formattedText,
      parse_mode: formatter.parse_mode,
    };
  }

  /**
   * Formats the current text as a link to the target URL
   */
  public url(targetUrl: string): string {
    return formatter.url(this.formattedText, targetUrl);
  }

  /**
   * Creates a formatted link with label and target
   */
  static urlBuilder(label: string, targetUrl: string): Fmt {
    return Fmt.builder(formatter.url(Fmt.escape(label), targetUrl));
  }

  /**
   * Creates a formatted link with label and target
   */
  static url(label: string, targetUrl: string): string {
    return this.urlBuilder(label, targetUrl).build();
  }

  /**
   * Creates a mention link for a Telegram user
   */
  static mention(label: string, userId: number): string {
    return formatter.userMention(Fmt.escape(label), userId);
  }

  /**
   * Replaces %{key} placeholders in the text with actual values
   */
  public injectPlaceholders(
    data: Record<string, string | number | undefined>,
  ): Fmt {
    this.formattedText = compilePlaceholders(this.formattedText, data);
    return this;
  }

  /** Alias for injectPlaceholders */
  inject = this.injectPlaceholders;

  /**
   * Adds a blockquote to the current text
   */
  addQuote(text: string | Fmt): Fmt {
    if (text instanceof Fmt) {
      text = text.build();
    }
    return this.add(formatter.blockquote(text));
  }

  /**
   * Makes the current text a blockquote
   */
  quote(): Fmt {
    this.formattedText = formatter.blockquote(this.formattedText);
    return this;
  }

  /**
   * Logs the current text to the console for debugging
   */
  public debug(label: string = ""): Fmt {
    console.log(label, this.formattedText);
    return this;
  }

  /**
   * Creates a labeled field with bold label and value.
   * Example: "📋 <b>Label</b>: Value"
   */
  static field(emoji: string, label: string, value: string | number): Fmt {
    return Fmt.builder(emoji)
      .space()
      .add(Fmt.builder(label).escape().bold())
      .add(": ")
      .add(Fmt.escape(String(value)));
  }

  /**
   * Creates a monospace field.
   * Example: "🆔 <b>ID</b>: <code>abc123</code>"
   */
  static codeField(emoji: string, label: string, value: string): Fmt {
    return Fmt.builder(emoji)
      .space()
      .add(Fmt.builder(label).escape().bold())
      .add(": ")
      .add(Fmt.monospace(value));
  }

  /**
   * Creates a header with emoji and bold text
   */
  static header(emoji: string, text: string): Fmt {
    return Fmt.builder(emoji).space().add(Fmt.builder(text).escape().bold());
  }

  /**
   * Creates a bullet point item
   */
  static bullet(text: string): Fmt {
    return Fmt.builder("• ").add(Fmt.escape(text));
  }
}

export default Fmt;
