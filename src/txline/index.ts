import { sleep } from "@/utils/helper";
import { emitScoreEvent, onScoreEvent, type ScoreEvent } from "./events";
import { RECORDED_FIXTURES } from "./fixtures";

export * from "./events";
export { RECORDED_FIXTURES } from "./fixtures";
export { watchLive } from "./live";

/**
 * REPLAY mode: stream a recorded fixture's events to every onScoreEvent
 * listener with a small delay between events, ending with "game_finalised".
 * Deterministic and offline, so the demo and video are repeatable on demand.
 *
 * Accepts a TxLINE fixture id, or a numeric db match id (resolved via @/db).
 * Pace with opts.stepMs or TXLINE_REPLAY_STEP_MS (default 1200ms, ~10s per
 * match).
 */
export async function replayMatch(
  matchId: string | number,
  opts: { stepMs?: number } = {},
): Promise<void> {
  const { fixtureId, dbId } = await resolveFixture(matchId);
  const events = RECORDED_FIXTURES[fixtureId];
  if (!events) {
    throw new Error(
      `No recorded fixture "${fixtureId}". Known fixtures: ${Object.keys(RECORDED_FIXTURES).join(", ")}`,
    );
  }
  const stepMs = opts.stepMs ?? Number(process.env.TXLINE_REPLAY_STEP_MS ?? 1200);
  for (let i = 0; i < events.length; i++) {
    if (i > 0) await sleep(stepMs);
    await emitScoreEvent(dbId == null ? events[i] : { ...events[i], matchId: dbId });
  }
}

/**
 * Accepts a fixture id or a numeric db match id; also resolves the db row id
 * so replayed events carry event.matchId. db is imported lazily and failures
 * are swallowed: replay stays fully offline-capable.
 */
async function resolveFixture(
  matchId: string | number,
): Promise<{ fixtureId: string; dbId?: number }> {
  const key = String(matchId);
  try {
    const [{ default: db }, { matches }, { eq }] = await Promise.all([
      import("@/db/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);
    const byDbId = /^\d+$/.test(key) && !RECORDED_FIXTURES[key];
    const match = await db.query.matches.findFirst({
      where: byDbId ? eq(matches.id, Number(key)) : eq(matches.fixtureId, key),
    });
    if (match) return { fixtureId: match.fixtureId, dbId: match.id };
  } catch {
    // db unreachable: events just go out without a matchId.
  }
  return { fixtureId: key };
}

/**
 * RECORD mode: capture whatever the feed emits (e.g. from watchLive) into an
 * array that can be pasted into fixtures.ts for later replay.
 */
export function record(): { stop: () => ScoreEvent[] } {
  const captured: ScoreEvent[] = [];
  const off = onScoreEvent((e) => {
    captured.push(e);
  });
  return {
    stop: () => {
      off();
      return captured;
    },
  };
}
