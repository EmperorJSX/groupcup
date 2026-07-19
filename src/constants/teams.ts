/**
 * Flag emojis for World Cup nations, keyed by English team name.
 * Fallback for when a match record does not carry its own flag emojis
 * (the engine's mock data may include them, see src/bot/engine.ts).
 */
export const TEAM_FLAGS: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Belgium: "🇧🇪",
  Brazil: "🇧🇷",
  Cameroon: "🇨🇲",
  Canada: "🇨🇦",
  Colombia: "🇨🇴",
  "Costa Rica": "🇨🇷",
  Croatia: "🇭🇷",
  Denmark: "🇩🇰",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Iran: "🇮🇷",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  Nigeria: "🇳🇬",
  Norway: "🇳🇴",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Senegal: "🇸🇳",
  Serbia: "🇷🇸",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Uruguay: "🇺🇾",
  USA: "🇺🇸",
  "United States": "🇺🇸",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
};

/** Flag for a team name, preferring an explicit emoji from the engine. */
export function flagFor(team: string, explicit?: string): string {
  return explicit || TEAM_FLAGS[team] || "🏳️";
}
