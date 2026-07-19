// Landing-page constants. Every CTA on the site points at the bot.
// ponytail: placeholder handle. Swap for the real @BotFather username before launch.
export const BOT_USERNAME = "groupcupbot";
export const BOT_URL = `https://t.me/${BOT_USERNAME}`;
export const ADD_TO_GROUP_URL = `https://t.me/${BOT_USERNAME}?startgroup=true`;

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
] as const;

export const X_LINK = "https://x.com/groupcup";
