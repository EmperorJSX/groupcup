/**
 * Pure scoring math. No db, no IO: everything here is deterministic and
 * covered by src/scoring/selftest.ts.
 */

export type Outcome = "home" | "draw" | "away";
export type MatchResult = { home: number; away: number };

/** Points for calling the 1X2 outcome. */
export const OUTCOME_POINTS = 3;

/** The 1X2 outcome a scoreline implies. */
export function outcomeOf(result: MatchResult): Outcome {
  if (result.home > result.away) return "home";
  if (result.home < result.away) return "away";
  return "draw";
}

/**
 * Score one pick against a scoreline: OUTCOME_POINTS for the correct 1X2
 * outcome, 0 otherwise. scorePrediction("home", { home: 2, away: 1 }) === 3.
 */
export function scorePrediction(pick: Outcome, result: MatchResult): number {
  return pick === outcomeOf(result) ? OUTCOME_POINTS : 0;
}

export type StandingInput = { userId: number; name: string; points: number };
export type Standing = StandingInput & { rank: number; delta: number };

/**
 * Competition ranking ("1224"): rows sort by points desc (then name, then
 * userId, so output order is deterministic) and tied rows share the rank of
 * the first of their tie. delta = prevRank - rank, so positive means the
 * player climbed; new entrants (no previous rank) get delta 0.
 */
export function rankStandings(
  entries: StandingInput[],
  prevRanks?: ReadonlyMap<number, number>,
): Standing[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.points - a.points || a.name.localeCompare(b.name) || a.userId - b.userId,
  );
  const out: Standing[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const rank =
      i > 0 && sorted[i].points === out[i - 1].points ? out[i - 1].rank : i + 1;
    const prev = prevRanks?.get(sorted[i].userId);
    out.push({
      ...sorted[i],
      rank,
      delta: prev == null || prev === 0 ? 0 : prev - rank,
    });
  }
  return out;
}
