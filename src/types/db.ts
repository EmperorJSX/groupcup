import type {
  groups,
  leaderboard,
  matches,
  polls,
  pots,
  predictions,
  users,
  wallets,
} from "@/db/schema";

export type UserType = typeof users.$inferSelect;
export type UserInsertType = typeof users.$inferInsert;

export type WalletType = typeof wallets.$inferSelect;
export type WalletInsertType = typeof wallets.$inferInsert;

export type GroupType = typeof groups.$inferSelect;
export type GroupInsertType = typeof groups.$inferInsert;

export type MatchType = typeof matches.$inferSelect;
export type MatchInsertType = typeof matches.$inferInsert;

export type PollType = typeof polls.$inferSelect;
export type PollInsertType = typeof polls.$inferInsert;

export type PredictionType = typeof predictions.$inferSelect;
export type PredictionInsertType = typeof predictions.$inferInsert;

export type LeaderboardType = typeof leaderboard.$inferSelect;
export type LeaderboardInsertType = typeof leaderboard.$inferInsert;

export type PotType = typeof pots.$inferSelect;
export type PotInsertType = typeof pots.$inferInsert;

/** Match outcome / prediction pick. */
export type Pick = "home" | "draw" | "away";
