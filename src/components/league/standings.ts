import {
  outcomeOf,
  rankStandings,
  scorePrediction,
  type MatchResult,
  type Standing,
} from "@/scoring/core";
import { RECORDED_FIXTURES } from "@/txline/fixtures";
import { MOCK_PLAYERS, MOCK_PREDICTIONS } from "@/lib/mock";
import type { FlagCode } from "@/components/landing/Flag";

/**
 * Demo-league math shared by /demo and /leaderboard: the real engine scoring
 * (src/scoring) applied to the seeded league (src/lib/mock) with results read
 * from the recorded TxLINE replays (src/txline).
 */

/** Home/away Flag codes per recorded fixture. */
export const FIXTURE_FLAGS: Record<string, [FlagCode, FlagCode]> = {
  "txl-wc26-sf1": ["ARG", "FRA"],
  "txl-wc26-sf2": ["BRA", "ENG"],
  "txl-wc26-final": ["ARG", "BRA"],
};

/** Full-time score of a recorded TxLINE fixture (its last replay event). */
export function fullTimeScore(fixtureId: string): MatchResult {
  const events = RECORDED_FIXTURES[fixtureId];
  const last = events[events.length - 1];
  return { home: last.home, away: last.away };
}

/** Results map for the given fixtures, read from the TxLINE replays. */
export function resultsFor(fixtureIds: readonly string[]): Map<string, MatchResult> {
  return new Map(fixtureIds.map((id) => [id, fullTimeScore(id)]));
}

/**
 * Ranked standings for a set of match results, the same math the engine's
 * recomputeLeaderboard runs: every prediction with a result scores points,
 * ties share a rank, deltas come from prevRanks.
 */
export function computeStandings(
  results: ReadonlyMap<string, MatchResult>,
  prevRanks?: ReadonlyMap<number, number>,
): Standing[] {
  return rankStandings(
    MOCK_PLAYERS.map((p, i) => ({
      userId: i + 1,
      name: p.name,
      points: MOCK_PREDICTIONS.filter((q) => q.tgId === p.tgId).reduce((sum, q) => {
        const result = results.get(q.fixtureId);
        return sum + (result ? scorePrediction(q.pick, result) : 0);
      }, 0),
    })),
    prevRanks,
  );
}

/** How many of a player's picks were correct across the given results. */
export function correctPicks(
  name: string,
  results: ReadonlyMap<string, MatchResult>,
): number {
  const player = MOCK_PLAYERS.find((p) => p.name === name);
  if (!player) return 0;
  return MOCK_PREDICTIONS.filter((q) => {
    if (q.tgId !== player.tgId) return false;
    const result = results.get(q.fixtureId);
    return result !== undefined && outcomeOf(result) === q.pick;
  }).length;
}

const PLAYER_STYLES = [
  { text: "text-primary", bg: "bg-primary" },
  { text: "text-orange", bg: "bg-orange" },
  { text: "text-green", bg: "bg-green" },
  { text: "text-violet", bg: "bg-violet" },
  { text: "text-live", bg: "bg-live" },
  { text: "text-gold", bg: "bg-gold" },
];

/** Stable avatar/name color per demo player. */
export function playerStyle(name: string) {
  const i = MOCK_PLAYERS.findIndex((p) => p.name === name);
  return PLAYER_STYLES[(i < 0 ? 0 : i) % PLAYER_STYLES.length];
}
