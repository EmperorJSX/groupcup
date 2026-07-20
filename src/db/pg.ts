import { and, asc, eq, inArray } from "drizzle-orm";
import type { LeaderboardInsertType, MatchInsertType } from "@/types/db";
import db from "./db";
import {
  groups,
  leaderboard,
  matches,
  polls,
  predictions,
  users,
  wallets,
} from "./schema";
import type { Store } from "./store";

/** Drizzle/postgres Store backend. All SQL for the engine lives here. */
export const pgStore: Store = {
  async findUserByTgId(tgId) {
    return db.query.users.findFirst({ where: eq(users.userId, tgId) });
  },

  async createUser(tgId, firstName) {
    const [created] = await db
      .insert(users)
      .values({ userId: tgId, firstName })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    // Lost a concurrent-insert race; the row exists now.
    const winner = await db.query.users.findFirst({
      where: eq(users.userId, tgId),
    });
    if (!winner) throw new Error(`Failed to create user ${tgId}`);
    return winner;
  },

  async setUserName(id, firstName) {
    const [updated] = await db
      .update(users)
      .set({ firstName })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new Error(`Unknown user ${id}`);
    return updated;
  },

  async findGroupByChatId(chatId) {
    return db.query.groups.findFirst({ where: eq(groups.chatId, chatId) });
  },

  async createGroup(chatId, title) {
    const [created] = await db
      .insert(groups)
      .values({ chatId, title })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const winner = await db.query.groups.findFirst({
      where: eq(groups.chatId, chatId),
    });
    if (!winner) throw new Error(`Failed to create group ${chatId}`);
    return winner;
  },

  async setGroupTitle(id, title) {
    const [updated] = await db
      .update(groups)
      .set({ title })
      .where(eq(groups.id, id))
      .returning();
    if (!updated) throw new Error(`Unknown group ${id}`);
    return updated;
  },

  async findWallet(userId) {
    return db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
  },

  async createWallet(userId, publicKey, encryptedSecret) {
    await db
      .insert(wallets)
      .values({ userId, publicKey, encryptedSecret })
      .onConflictDoNothing();
  },

  async findMatchById(id) {
    return db.query.matches.findFirst({ where: eq(matches.id, id) });
  },

  async findMatchByFixture(fixtureId) {
    return db.query.matches.findFirst({
      where: eq(matches.fixtureId, fixtureId),
    });
  },

  async upsertMatch(values: MatchInsertType) {
    const [row] = await db
      .insert(matches)
      .values(values)
      .onConflictDoUpdate({ target: matches.fixtureId, set: values })
      .returning();
    return row;
  },

  async listScheduledMatches() {
    return db.query.matches.findMany({
      where: eq(matches.status, "scheduled"),
      orderBy: asc(matches.kickoffAt),
    });
  },

  async lockMatch(matchId) {
    await db
      .update(matches)
      .set({ status: "locked" })
      .where(and(eq(matches.id, matchId), eq(matches.status, "scheduled")));
    await db
      .update(polls)
      .set({ status: "locked" })
      .where(and(eq(polls.matchId, matchId), eq(polls.status, "open")));
  },

  async applyScore(fixtureId, home, away, finalised) {
    const [match] = await db
      .update(matches)
      .set({
        homeScore: home,
        awayScore: away,
        status: finalised ? "finished" : "live",
        ...(finalised ? { finalizedAt: new Date() } : {}),
      })
      .where(eq(matches.fixtureId, fixtureId))
      .returning();
    if (match && finalised) {
      await db
        .update(polls)
        .set({ status: "settled", settledAt: new Date() })
        .where(eq(polls.matchId, match.id));
    }
    return match;
  },

  async upsertOpenPoll(groupId, matchId, lockAt) {
    const [poll] = await db
      .insert(polls)
      .values({ groupId, matchId, lockAt })
      // No-op update so returning() yields the existing row on conflict.
      .onConflictDoUpdate({
        target: [polls.groupId, polls.matchId],
        set: { matchId },
      })
      .returning();
    return poll;
  },

  async reopenPolls(matchIds) {
    if (matchIds.length === 0) return;
    await db
      .update(polls)
      .set({ status: "open", settledAt: null })
      .where(inArray(polls.matchId, matchIds));
  },

  async groupIdsWithPolls(matchId) {
    const rows = await db
      .selectDistinct({ groupId: polls.groupId })
      .from(polls)
      .where(eq(polls.matchId, matchId));
    return rows.map((r) => r.groupId);
  },

  async upsertPredictionPick(pollId, userId, pick) {
    await db
      .insert(predictions)
      .values({ pollId, userId, pick })
      .onConflictDoUpdate({
        target: [predictions.pollId, predictions.userId],
        set: { pick },
      });
  },

  async setPredictionPoints(predictionId, points) {
    await db
      .update(predictions)
      .set({ points })
      .where(eq(predictions.id, predictionId));
  },

  async predictionRowsForGroup(groupId) {
    return db
      .select({
        predictionId: predictions.id,
        storedPoints: predictions.points,
        pick: predictions.pick,
        userId: predictions.userId,
        firstName: users.firstName,
        username: users.username,
        matchStatus: matches.status,
        home: matches.homeScore,
        away: matches.awayScore,
      })
      .from(predictions)
      .innerJoin(polls, eq(polls.id, predictions.pollId))
      .innerJoin(matches, eq(matches.id, polls.matchId))
      .innerJoin(users, eq(users.id, predictions.userId))
      .where(eq(polls.groupId, groupId));
  },

  async leaderboardRows(groupId) {
    return db.query.leaderboard.findMany({
      where: eq(leaderboard.groupId, groupId),
    });
  },

  async upsertLeaderboardRow(row: LeaderboardInsertType) {
    await db
      .insert(leaderboard)
      .values(row)
      .onConflictDoUpdate({
        target: [leaderboard.groupId, leaderboard.userId],
        set: row,
      });
  },

  async leaderboardJoined(groupId) {
    return db
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
      // Same tie order as rankStandings: rank, then name, then id.
      .orderBy(asc(leaderboard.rank), asc(users.firstName), asc(users.id));
  },
};
