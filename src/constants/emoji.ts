/**
 * Emoji palette for message building. The football set below is used across
 * polls, the leaderboard, and pundit reactions.
 *
 * ponytail: values are plain unicode. jomo shipped custom-emoji ids too, but
 * those are Telegram-Premium only, so they are dropped here.
 */
export const emojis = {
  // Navigation and UI
  rocket: "🚀",
  globe: "🌐",
  bot: "🤖",
  speed: "⚡",

  // Status and feedback
  successEmoji: "✅",
  failedEmoji: "❌",
  errorEmoji: "⚠️",
  infoEmoji: "ℹ️",
  pendingEmoji: "⏳",
  lockEmoji: "🔒",

  // Football and league
  soccerEmoji: "⚽",
  trophyEmoji: "🏆",
  medalEmoji: "🏅",
  whistleEmoji: "📣",
  fireEmoji: "🔥",
  targetEmoji: "🎯",
  chartEmoji: "📊",
  crownEmoji: "👑",
  goalEmoji: "🥅",
  redCardEmoji: "🟥",
  yellowCardEmoji: "🟨",

  // Money and pot
  moneyBagEmoji: "💰",
  gemEmoji: "💎",
  coinEmoji: "🪙",

  // People and social
  waveEmoji: "👋",
  userEmoji: "👤",
  starEmoji: "⭐",
  partyEmoji: "🎉",
  bookEmoji: "📚",
  micEmoji: "🎙️",
} as const satisfies Record<string, string>;

export type SupportedEmojis = keyof typeof emojis;
