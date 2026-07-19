// Landing-page constants. Every CTA on the site points at the bot.
// ponytail: placeholder handle. Swap for the real @BotFather username before launch.
export const BOT_USERNAME = "groupcupbot";
export const BOT_URL = `https://t.me/${BOT_USERNAME}`;
export const ADD_TO_GROUP_URL = `https://t.me/${BOT_USERNAME}?startgroup=true`;

/** The judge-testable in-browser bot demo. */
export const DEMO_URL = "/demo";

export const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Live", href: DEMO_URL },
  { label: "Leaderboard", href: "#live" },
  { label: "Features", href: "#features" },
  { label: "FAQs", href: "#faqs" },
] as const;

export const X_LINK = "https://x.com/groupcup";
