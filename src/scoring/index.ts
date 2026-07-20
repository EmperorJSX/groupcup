import type { LeaderRow } from "@/db/queries";
import { store } from "@/db/store";
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
  const rows = await store.predictionRowsForGroup(groupId);

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
    await store.setPredictionPoints(u.id, u.points);
  }

  const existing = await store.leaderboardRows(groupId);
  const prevRanks = new Map(existing.map((e) => [e.userId, e.rank]));

  const standings = rankStandings(
    [...byUser].map(([userId, a]) => ({ userId, name: a.name, points: a.points })),
    prevRanks,
  );

  for (const s of standings) {
    const agg = byUser.get(s.userId)!;
    await store.upsertLeaderboardRow({
      groupId,
      userId: s.userId,
      points: s.points,
      correctCount: agg.correct,
      predictionsCount: agg.count,
      rank: s.rank,
      prevRank: prevRanks.get(s.userId) ?? null,
      updatedAt: new Date(),
    });
  }

  return standings.map((s) => ({
    name: s.name,
    points: s.points,
    rank: s.rank,
    delta: s.delta,
  }));
}

/** PROD-BUILD contract alias for recomputeLeaderboard. */
export const computeLeaderboard = recomputeLeaderboard;

/**
 * Finalise a match by TxLINE fixture id at its current score: mark it
 * finished, settle its polls, and recompute the standings of every group
 * that ran a poll on it. No-op for unknown fixtures.
 */
export async function settleMatch(fixtureId: string): Promise<void> {
  const match = await store.findMatchByFixture(fixtureId);
  if (!match) return;
  await store.applyScore(fixtureId, match.homeScore, match.awayScore, true);
  for (const groupId of await store.groupIdsWithPolls(match.id)) {
    await recomputeLeaderboard(groupId);
  }
}
