import type {
  LeaderboardInsertType,
  LeaderboardType,
  MatchInsertType,
  MatchType,
  GroupType,
  Pick,
  PollType,
  UserType,
  WalletType,
} from "@/types/db";
import { memoryStore } from "./memory";
import { pgStore } from "./pg";

/**
 * Storage facade for the whole engine. Every db access (queries, scoring,
 * solana, seed) goes through `store`, which runs on drizzle/postgres and
 * falls back to a typed in-memory backend the moment postgres proves
 * unreachable, so `bun run demo` works with zero infrastructure.
 *
 * ponytail: the fallback flips once per process on the first connection
 * error (the no-postgres-at-all case). A connection lost mid-run restarts
 * on an empty memory store; per-call replication if that ever matters.
 */

/** Joined prediction row that recomputeLeaderboard scores. */
export type PredictionScoringRow = {
  predictionId: number;
  storedPoints: number;
  pick: Pick;
  userId: number;
  firstName: string | null;
  username: string | null;
  matchStatus: MatchType["status"];
  home: number;
  away: number;
};

/** Joined leaderboard row as getLeaderboard renders it. */
export type LeaderboardJoinedRow = {
  points: number;
  rank: number;
  prevRank: number | null;
  firstName: string | null;
  username: string | null;
};

export interface Store {
  findUserByTgId(tgId: string): Promise<UserType | undefined>;
  /** Race-safe: returns the existing row when the tgId already exists. */
  createUser(tgId: string, firstName?: string): Promise<UserType>;
  setUserName(id: number, firstName: string): Promise<UserType>;

  findGroupByChatId(chatId: string): Promise<GroupType | undefined>;
  createGroup(chatId: string, title?: string): Promise<GroupType>;
  setGroupTitle(id: number, title: string): Promise<GroupType>;

  findWallet(userId: number): Promise<WalletType | undefined>;
  /** Conflict-ignoring: concurrent inserts of the same userId are a no-op. */
  createWallet(
    userId: number,
    publicKey: string,
    encryptedSecret: string,
  ): Promise<void>;

  findMatchById(id: number): Promise<MatchType | undefined>;
  findMatchByFixture(fixtureId: string): Promise<MatchType | undefined>;
  upsertMatch(values: MatchInsertType): Promise<MatchType>;
  listScheduledMatches(): Promise<MatchType[]>;
  /** scheduled -> locked, and every open poll on the match -> locked. */
  lockMatch(matchId: number): Promise<void>;
  /**
   * Write a score onto the match; finalised also settles it and its polls.
   * Returns undefined when no match has that fixtureId.
   */
  applyScore(
    fixtureId: string,
    home: number,
    away: number,
    finalised: boolean,
  ): Promise<MatchType | undefined>;

  upsertOpenPoll(groupId: number, matchId: number, lockAt: Date): Promise<PollType>;
  reopenPolls(matchIds: number[]): Promise<void>;
  groupIdsWithPolls(matchId: number): Promise<number[]>;

  upsertPredictionPick(pollId: number, userId: number, pick: Pick): Promise<void>;
  setPredictionPoints(predictionId: number, points: number): Promise<void>;
  predictionRowsForGroup(groupId: number): Promise<PredictionScoringRow[]>;

  leaderboardRows(groupId: number): Promise<LeaderboardType[]>;
  upsertLeaderboardRow(row: LeaderboardInsertType): Promise<void>;
  leaderboardJoined(groupId: number): Promise<LeaderboardJoinedRow[]>;
}

export type BackendName = "postgres" | "memory";

let active: BackendName | undefined;

function pickBackend(): BackendName {
  if (active) return active;
  const forced = process.env.GROUPCUP_DB;
  active = forced === "memory" ? "memory" : "postgres";
  return active;
}

/** Which backend the process ended up on (for logs and the demo banner). */
export function activeDbBackend(): BackendName {
  return pickBackend();
}

const CONN_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
  // Reachable server, but not ours: bad credentials or missing database.
  // Zero-config demo must not crash because port 5432 is someone else's.
  "28000",
  "28P01",
  "3D000",
]);

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; errors?: unknown[]; cause?: unknown };
  if (typeof e.code === "string" && CONN_CODES.has(e.code)) return true;
  if (Array.isArray(e.errors) && e.errors.some(isConnectionError)) return true;
  return isConnectionError(e.cause);
}

let warned = false;

function wrap<K extends keyof Store>(key: K): Store[K] {
  const method = (async (...args: unknown[]) => {
    const backend = pickBackend() === "memory" ? memoryStore : pgStore;
    const fn = backend[key] as (...a: unknown[]) => Promise<unknown>;
    try {
      return await fn.apply(backend, args);
    } catch (err) {
      if (backend === pgStore && isConnectionError(err)) {
        active = "memory";
        if (!warned) {
          warned = true;
          console.warn(
            "[db] postgres unreachable, falling back to the in-memory store " +
              "(set DATABASE_URL to persist).",
          );
        }
        const mem = memoryStore[key] as (...a: unknown[]) => Promise<unknown>;
        return mem.apply(memoryStore, args);
      }
      throw err;
    }
  }) as Store[K];
  return method;
}

export const store: Store = {
  findUserByTgId: wrap("findUserByTgId"),
  createUser: wrap("createUser"),
  setUserName: wrap("setUserName"),
  findGroupByChatId: wrap("findGroupByChatId"),
  createGroup: wrap("createGroup"),
  setGroupTitle: wrap("setGroupTitle"),
  findWallet: wrap("findWallet"),
  createWallet: wrap("createWallet"),
  findMatchById: wrap("findMatchById"),
  findMatchByFixture: wrap("findMatchByFixture"),
  upsertMatch: wrap("upsertMatch"),
  listScheduledMatches: wrap("listScheduledMatches"),
  lockMatch: wrap("lockMatch"),
  applyScore: wrap("applyScore"),
  upsertOpenPoll: wrap("upsertOpenPoll"),
  reopenPolls: wrap("reopenPolls"),
  groupIdsWithPolls: wrap("groupIdsWithPolls"),
  upsertPredictionPick: wrap("upsertPredictionPick"),
  setPredictionPoints: wrap("setPredictionPoints"),
  predictionRowsForGroup: wrap("predictionRowsForGroup"),
  leaderboardRows: wrap("leaderboardRows"),
  upsertLeaderboardRow: wrap("upsertLeaderboardRow"),
  leaderboardJoined: wrap("leaderboardJoined"),
};
