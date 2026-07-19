import {
  bigint,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Telegram users. Identity for the on-chain layer is the custodial wallet in
 * the `wallets` table (one per user), so there are no seed phrases here.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Telegram user id. */
  userId: text("user_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code").notNull().default("en"),
  role: text("role", { enum: ["user", "admin"] })
    .notNull()
    .default("user"),
  status: text("status", { enum: ["active", "suspended", "banned"] })
    .notNull()
    .default("active"),
  /** False once the user blocks the bot. Never send to these users. */
  canNotify: integer("can_notify").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Custodial Solana wallet per user. The public key is the player's identity;
 * the secret key is encrypted at rest (see src/solana/wallets.ts).
 */
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull().unique(),
  /** Encrypted secret key reference (nonce:ciphertext), never the raw key. */
  encryptedSecret: text("encrypted_secret").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** A Telegram group chat that runs a prediction league. */
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  /** Telegram chat id (negative for groups/supergroups). */
  chatId: text("chat_id").notNull().unique(),
  title: text("title"),
  addedBy: integer("added_by").references(() => users.id, {
    onDelete: "set null",
  }),
  potEnabled: integer("pot_enabled").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * A fixture from the TxLINE feed. Kickoff drives the poll lock; the live score
 * and finalisation are written from the score stream.
 */
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  /** TxLINE fixture id. */
  fixtureId: text("fixture_id").notNull().unique(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  kickoffAt: timestamp("kickoff_at").notNull(),
  status: text("status", { enum: ["scheduled", "live", "finished"] })
    .notNull()
    .default("scheduled"),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  finalizedAt: timestamp("finalized_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * One dropped prediction poll: a match posted into a group. Locked at kickoff,
 * settled when the match finalises. This is the core object of the loop.
 */
export const polls = pgTable(
  "polls",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    /** Telegram message id of the poll card, edited in place as it updates. */
    chatMessageId: integer("chat_message_id"),
    status: text("status", { enum: ["open", "locked", "settled"] })
      .notNull()
      .default("open"),
    lockAt: timestamp("lock_at").notNull(),
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("polls_group_match").on(t.groupId, t.matchId)],
);

/** A single user's pick for a poll. One per (poll, user). */
export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    pollId: integer("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pick: text("pick", { enum: ["home", "draw", "away"] }).notNull(),
    /** Optional exact-score guess for bonus points. */
    exactHome: integer("exact_home"),
    exactAway: integer("exact_away"),
    /** Points awarded at settlement (0 until then). */
    points: integer("points").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("predictions_poll_user").on(t.pollId, t.userId)],
);

/** Aggregate standings per (group, user). Rebuilt from predictions. */
export const leaderboard = pgTable(
  "leaderboard",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    exactCount: integer("exact_count").notNull().default(0),
    predictionsCount: integer("predictions_count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("leaderboard_group_user").on(t.groupId, t.userId)],
);

/**
 * Optional on-chain prize pool per group. The escrow account holds entries;
 * the winner claims at settlement, minus a rake. Skeleton only.
 * ponytail: single season pot per group; per-match-week pots if demand shows up.
 */
export const pots = pgTable("pots", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  /** Escrow account public key that holds the pooled lamports. */
  escrowPublicKey: text("escrow_public_key").notNull(),
  totalLamports: bigint("total_lamports", { mode: "number" })
    .notNull()
    .default(0),
  status: text("status", { enum: ["open", "locked", "settled"] })
    .notNull()
    .default("open"),
  winnerUserId: integer("winner_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  payoutTx: text("payout_tx"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
