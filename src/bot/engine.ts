/**
 * Single import surface for the engine modules built by the groupcup-engine
 * agent (contract: context/BOT-BUILD.md). Every bot file imports the engine
 * through this adapter so any signature drift is reconciled in one file.
 *
 * The interfaces below are the bot's structural expectations. The casts at
 * the bottom are the contract boundary. Integration assumptions, flagged for
 * the lead:
 * - ids passed to upsertPrediction/getLeaderboard are the engine's own row
 *   ids (user.id / group.id), not raw Telegram ids.
 * - a prediction pick is "home" | "draw" | "away".
 * - score events carry matchId plus the current score, and the final event
 *   has type "game_finalised".
 */

import * as db from "@/db";
import * as scoring from "@/scoring";
import * as txline from "@/txline";
import * as solana from "@/solana";

// ---------------------------------------------------------------------------
// Structural types the bot renders from
// ---------------------------------------------------------------------------

export interface EngineUser {
  id: number;
  name: string;
}

export interface EngineGroup {
  id: number;
  title: string;
}

export interface Match {
  id: number;
  home: string;
  away: string;
  /** Optional flag emojis; the bot falls back to its own team-flag map. */
  homeFlag?: string;
  awayFlag?: string;
  /** Kickoff time, tolerated as Date, ISO string, or epoch ms. */
  kickoff: Date | string | number;
  status?: string;
}

export interface LeaderRow {
  name: string;
  points: number;
  rank: number;
  /** Rank movement since the previous update; positive means climbed. */
  delta: number;
}

export type PredictionPick = "home" | "draw" | "away";

export interface ScoreEvent {
  matchId: number;
  homeScore: number;
  awayScore: number;
  /** Match minute, when the feed provides one. */
  minute?: number;
  /** Event kind; "game_finalised" marks the final whistle. */
  type?: string;
}

export interface Wallet {
  pubkey: string;
}

// ---------------------------------------------------------------------------
// Engine functions (typed re-exports; the casts are the contract boundary)
// ---------------------------------------------------------------------------

export const getOrCreateUser = db.getOrCreateUser as (
  tgId: string,
  name: string,
) => Promise<EngineUser>;

export const getOrCreateGroup = db.getOrCreateGroup as (
  chatId: string,
  title: string,
) => Promise<EngineGroup>;

export const upsertPrediction = db.upsertPrediction as (
  groupId: number,
  userId: number,
  matchId: number,
  pick: PredictionPick,
) => Promise<void>;

export const getLeaderboard = db.getLeaderboard as (
  groupId: number,
) => Promise<LeaderRow[]>;

export const listOpenMatches = db.listOpenMatches as () => Promise<Match[]>;

export const lockMatch = db.lockMatch as (matchId: number) => Promise<void>;

export const recomputeLeaderboard = scoring.recomputeLeaderboard as (
  groupId: number,
) => Promise<LeaderRow[]>;

export const onScoreEvent = txline.onScoreEvent as (
  cb: (event: ScoreEvent) => void | Promise<void>,
) => void;

export const replayMatch = txline.replayMatch as (
  matchId: number,
) => Promise<void>;

export const getOrCreateWallet = solana.getOrCreateWallet as (
  userId: number,
) => Promise<Wallet>;

// ---------------------------------------------------------------------------
// Small shared helpers over engine data
// ---------------------------------------------------------------------------

/** Kickoff as epoch ms, whatever shape the engine stores it in. */
export function kickoffMs(match: Pick<Match, "kickoff">): number {
  const { kickoff } = match;
  if (kickoff instanceof Date) return kickoff.getTime();
  if (typeof kickoff === "number") return kickoff;
  return new Date(kickoff).getTime();
}

/** True once a match's kickoff time has passed. */
export function hasKickedOff(match: Pick<Match, "kickoff">): boolean {
  return Date.now() >= kickoffMs(match);
}
