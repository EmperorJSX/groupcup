import { eq } from "drizzle-orm";
import db from "@/db/db";
import { leaderboard, matches, polls, predictions, users } from "@/db/schema";
import type { LeaderRow } from "@/db/queries";
import { rankStandings, scorePrediction } from "./core";

export * from "./core";
export type { LeaderRow } from "@/db/queries";

/**
 * Rebuild a group's standings from its predictions and current match scores,
 * persist them (points, counts, rank, prevRank), and return the rows in rank
 * order. Live matches score provisionally so the board moves while goals
 * stream in; only finished matches count toward correctCount. Deterministic
 * for a given db state.
 */
export async function recomputeLeaderboard(groupId: number): Promise<LeaderRow[]> {
  const rows = await db
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

  type Agg = { name: string; points: number; correct: number; count: number };
  const byUser = new Map<number, Agg>();
  const pointsUpdates: Array<{ id: number; points: number }> = [];
  for (const r of rows) {
    const agg = byUser.get(r.userId) ?? {
      name: r.firstName ?? r.username ?? "Player",
      points: 0,
      correct: 0,
      count: 0,
    };
    const started = r.matchStatus === "live" || r.matchStatus === "finished";
    const pts = started
      ? scorePrediction(r.pick, { home: r.home, away: r.away })
      : 0;
    agg.count += 1;
    agg.points += pts;
    if (r.matchStatus === "finished" && pts > 0) agg.correct += 1;
    if (pts !== r.storedPoints) pointsUpdates.push({ id: r.predictionId, points: pts });
    byUser.set(r.userId, agg);
  }
  for (const u of pointsUpdates) {
    await db
      .update(predictions)
      .set({ points: u.points })
      .where(eq(predictions.id, u.id));
  }

  const existing = await db.query.leaderboard.findMany({
    where: eq(leaderboard.groupId, groupId),
  });
  const prevRanks = new Map(existing.map((e) => [e.userId, e.rank]));

  const standings = rankStandings(
    [...byUser].map(([userId, a]) => ({ userId, name: a.name, points: a.points })),
    prevRanks,
  );

  for (const s of standings) {
    const agg = byUser.get(s.userId)!;
    const values = {
      groupId,
      userId: s.userId,
      points: s.points,
      correctCount: agg.correct,
      predictionsCount: agg.count,
      rank: s.rank,
      prevRank: prevRanks.get(s.userId) ?? null,
      updatedAt: new Date(),
    };
    await db
      .insert(leaderboard)
      .values(values)
      .onConflictDoUpdate({
        target: [leaderboard.groupId, leaderboard.userId],
        set: values,
      });
  }

  return standings.map((s) => ({
    name: s.name,
    points: s.points,
    rank: s.rank,
    delta: s.delta,
  }));
}
