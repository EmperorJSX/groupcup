import { and, asc, eq } from "drizzle-orm";
import db from "./db";
import { groups, leaderboard, matches, polls, predictions, users } from "./schema";

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
  const found = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });
  if (found) {
    if (name && name !== found.firstName) {
      const [updated] = await db
        .update(users)
        .set({ firstName: name })
        .where(eq(users.id, found.id))
        .returning();
      return withName(updated);
    }
    return withName(found);
  }
  const [created] = await db
    .insert(users)
    .values({ userId, firstName: name })
    .onConflictDoNothing()
    .returning();
  if (created) return withName(created);
  // Lost a concurrent-insert race; the row exists now.
  const winner = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });
  if (!winner) throw new Error(`Failed to create user ${userId}`);
  return withName(winner);
}

/** Find a group league by Telegram chat id, creating it on first contact. */
export async function getOrCreateGroup(
  chatId: string | number,
  title?: string,
): Promise<Group> {
  const id = String(chatId);
  const found = await db.query.groups.findFirst({
    where: eq(groups.chatId, id),
  });
  if (found) {
    if (title && title !== found.title) {
      const [updated] = await db
        .update(groups)
        .set({ title })
        .where(eq(groups.id, found.id))
        .returning();
      return updated;
    }
    return found;
  }
  const [created] = await db
    .insert(groups)
    .values({ chatId: id, title })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const winner = await db.query.groups.findFirst({
    where: eq(groups.chatId, id),
  });
  if (!winner) throw new Error(`Failed to create group ${id}`);
  return winner;
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
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error(`Unknown match ${matchId}`);
  if (match.status !== "scheduled") {
    throw new Error("Predictions are locked for this match");
  }
  const [poll] = await db
    .insert(polls)
    .values({ groupId, matchId, lockAt: match.kickoffAt })
    // No-op update so returning() yields the existing row on conflict.
    .onConflictDoUpdate({
      target: [polls.groupId, polls.matchId],
      set: { matchId },
    })
    .returning();
  if (poll.status !== "open") throw new Error("This poll is locked");
  await db
    .insert(predictions)
    .values({ pollId: poll.id, userId, pick })
    .onConflictDoUpdate({
      target: [predictions.pollId, predictions.userId],
      set: { pick },
    });
}

/** Current standings for a group, as persisted by the last recompute. */
export async function getLeaderboard(groupId: number): Promise<LeaderRow[]> {
  const rows = await db
    .select({
      points: leaderboard.points,
      rank: leaderboard.rank,
      prevRank: leaderboard.prevRank,
      firstName: users.firstName,
      username: users.username,
    })
    .from(leaderboard)
    .innerJoin(users, eq(users.id, leaderboard.userId))
    .where(eq(leaderboard.groupId, groupId))
    // Same tie order as rankStandings: rank, then name.
    .orderBy(asc(leaderboard.rank), asc(users.firstName), asc(users.id));
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
  const rows = await db.query.matches.findMany({
    where: eq(matches.status, "scheduled"),
    orderBy: asc(matches.kickoffAt),
  });
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
  await db
    .update(matches)
    .set({ status: "locked" })
    .where(and(eq(matches.id, matchId), eq(matches.status, "scheduled")));
  await db
    .update(polls)
    .set({ status: "locked" })
    .where(and(eq(polls.matchId, matchId), eq(polls.status, "open")));
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
  const finalised = event.kind === "game_finalised";
  const [match] = await db
    .update(matches)
    .set({
      homeScore: event.home,
      awayScore: event.away,
      status: finalised ? "finished" : "live",
      ...(finalised ? { finalizedAt: new Date() } : {}),
    })
    .where(eq(matches.fixtureId, event.fixtureId))
    .returning();
  if (match && finalised) {
    await db
      .update(polls)
      .set({ status: "settled", settledAt: new Date() })
      .where(eq(polls.matchId, match.id));
  }
  return match;
}
