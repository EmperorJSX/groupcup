/** One event on the TxLINE score feed. "game_finalised" is the final marker. */
export type ScoreEventKind =
  | "kickoff"
  | "goal"
  | "half_time"
  | "full_time"
  | "game_finalised";

export type ScoreEvent = {
  /** TxLINE fixture id (matches.fixtureId). */
  fixtureId: string;
  kind: ScoreEventKind;
  minute: number;
  /** Running score after this event. */
  home: number;
  away: number;
  team?: "home" | "away";
  scorer?: string;
  /**
   * Aliases the bot reads (see src/bot/engine.ts): matchId is the db
   * matches.id when resolvable; homeScore/awayScore/type mirror
   * home/away/kind and are filled in by emitScoreEvent.
   */
  matchId?: number;
  homeScore?: number;
  awayScore?: number;
  type?: ScoreEventKind;
};

export type ScoreListener = (event: ScoreEvent) => void | Promise<void>;

const listeners = new Set<ScoreListener>();

/** Subscribe to score events (live or replay). Returns an unsubscribe fn. */
export function onScoreEvent(cb: ScoreListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Fan an event out to every listener, sequentially and awaited, so a
 * listener's db writes land before the next event fires (ordering matters
 * for scoring).
 */
export async function emitScoreEvent(event: ScoreEvent): Promise<void> {
  const full: ScoreEvent = {
    ...event,
    homeScore: event.home,
    awayScore: event.away,
    type: event.kind,
  };
  for (const cb of [...listeners]) await cb(full);
}
