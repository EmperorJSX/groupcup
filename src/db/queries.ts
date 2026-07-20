import type { groups, matches, polls, predictions, users } from "./schema";
import { store } from "./store";

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type MatchPick = Prediction["pick"];

/** One leaderboard line as the bot renders it. */
export type LeaderRow = {
  name: string;
  points: number;
  /** 1-based competition rank (ties share a rank). */
  rank: number;
  /** Positions moved since the previous recompute; positive = climbed. */
  delta: number;
};

/** Engine user rows expose a render-ready `name` for the bot. */
function withName(u: User): User & { name: string } {
  return { ...u, name: u.firstName ?? u.username ?? "Player" };
}

/** Find a user by Telegram id, creating them on first contact. */
export async function getOrCreateUser(
  tgId: string | number,
  name?: string,
): Promise<User & { name: string }> {
  const userId = String(tgId);
  const found = await store.findUserByTgId(userId);
  if (found) {
    if (name && name !== found.firstName) {
      return withName(await store.setUserName(found.id, name));
    }
    return withName(found);
  }
  return withName(await store.createUser(userId, name));
}

/** Find a group league by Telegram chat id, creating it on first contact. */
export async function getOrCreateGroup(
  chatId: string | number,
  title?: string,
): Promise<Group> {
  const id = String(chatId);
  const found = await store.findGroupByChatId(id);
  if (found) {
    if (title && title !== found.title) {
      return store.setGroupTitle(found.id, title);
    }
    return found;
  }
  return store.createGroup(id, title);
}

/**
 * Record (or change) a user's pick for a match in a group. The poll row for
 * (group, match) is created on first pick. Throws once the match is locked.
 */
export async function upsertPrediction(
  groupId: number,
  userId: number,
  matchId: number,
  pick: MatchPick,
): Promise<void> {
  const match = await store.findMatchById(matchId);
  if (!match) throw new Error(`Unknown match ${matchId}`);
  if (match.status !== "scheduled") {
    throw new Error("Predictions are locked for this match");
  }
  const poll = await store.upsertOpenPoll(groupId, matchId, match.kickoffAt);
  if (poll.status !== "open") throw new Error("This poll is locked");
  await store.upsertPredictionPick(poll.id, userId, pick);
}

/** Current standings for a group, as persisted by the last recompute. */
export async function getLeaderboard(groupId: number): Promise<LeaderRow[]> {
  const rows = await store.leaderboardJoined(groupId);
  return rows.map((r) => ({
    name: r.firstName ?? r.username ?? "Player",
    points: r.points,
    rank: r.rank,
    delta: r.prevRank == null ? 0 : r.prevRank - r.rank,
  }));
}

/** Match row plus the render aliases the bot reads (see src/bot/engine.ts). */
export type OpenMatch = Omit<Match, "homeFlag" | "awayFlag"> & {
  home: string;
  away: string;
  kickoff: Date;
  homeFlag?: string;
  awayFlag?: string;
};

/** Matches still open for predictions, soonest kickoff first. */
export async function listOpenMatches(): Promise<OpenMatch[]> {
  const rows = await store.listScheduledMatches();
  return rows.map((m) => ({
    ...m,
    home: m.homeTeam,
    away: m.awayTeam,
    kickoff: m.kickoffAt,
    homeFlag: m.homeFlag ?? undefined,
    awayFlag: m.awayFlag ?? undefined,
  }));
}

/** Close predictions at kickoff: lock the match and every open poll on it. */
export async function lockMatch(matchId: number): Promise<void> {
  await store.lockMatch(matchId);
}

/**
 * Persist a TxLINE score event onto the match row (typed structurally so this
 * module stays independent of @/txline). game_finalised settles the match and
 * its polls; any other kind marks it live with the running score.
 */
export async function applyScoreEvent(event: {
  fixtureId: string;
  kind: string;
  home: number;
  away: number;
}): Promise<Match | undefined> {
  return store.applyScore(
    event.fixtureId,
    event.home,
    event.away,
    event.kind === "game_finalised",
  );
}
