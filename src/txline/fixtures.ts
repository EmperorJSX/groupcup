import type { ScoreEvent } from "./events";

/**
 * Recorded event streams for the demo (REPLAY mode): seeded, deterministic,
 * no network. Fixture ids line up with src/lib/mock matches. Each stream ends
 * with the "game_finalised" marker.
 */

function ev(
  fixtureId: string,
  kind: ScoreEvent["kind"],
  minute: number,
  home: number,
  away: number,
  team?: "home" | "away",
  scorer?: string,
): ScoreEvent {
  return { fixtureId, kind, minute, home, away, team, scorer };
}

const SF1 = "txl-wc26-sf1"; // Argentina v France, comeback 2-1
const SF2 = "txl-wc26-sf2"; // Brazil v England, late winner 2-1
const FINAL = "txl-wc26-final"; // Argentina v Brazil, 3-2 thriller

export const RECORDED_FIXTURES: Record<string, ScoreEvent[]> = {
  [SF1]: [
    ev(SF1, "kickoff", 0, 0, 0),
    ev(SF1, "goal", 12, 0, 1, "away", "Mbappe"),
    ev(SF1, "goal", 44, 1, 1, "home", "Alvarez"),
    ev(SF1, "half_time", 45, 1, 1),
    ev(SF1, "goal", 78, 2, 1, "home", "Messi"),
    ev(SF1, "full_time", 90, 2, 1),
    ev(SF1, "game_finalised", 90, 2, 1),
  ],
  [SF2]: [
    ev(SF2, "kickoff", 0, 0, 0),
    ev(SF2, "goal", 30, 0, 1, "away", "Kane"),
    ev(SF2, "half_time", 45, 0, 1),
    ev(SF2, "goal", 61, 1, 1, "home", "Vinicius"),
    ev(SF2, "goal", 90, 2, 1, "home", "Endrick"),
    ev(SF2, "full_time", 92, 2, 1),
    ev(SF2, "game_finalised", 92, 2, 1),
  ],
  [FINAL]: [
    ev(FINAL, "kickoff", 0, 0, 0),
    ev(FINAL, "goal", 8, 1, 0, "home", "Messi"),
    ev(FINAL, "goal", 23, 1, 1, "away", "Vinicius"),
    ev(FINAL, "half_time", 45, 1, 1),
    ev(FINAL, "goal", 55, 1, 2, "away", "Rodrygo"),
    ev(FINAL, "goal", 71, 2, 2, "home", "Alvarez"),
    ev(FINAL, "goal", 88, 3, 2, "home", "Messi"),
    ev(FINAL, "full_time", 94, 3, 2),
    ev(FINAL, "game_finalised", 94, 3, 2),
  ],
};
