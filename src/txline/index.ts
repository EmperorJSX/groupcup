import { sleep } from "@/utils/helper";
import {
  fetchFixtures,
  fetchScore,
  type TxlineFixture,
  type TxlineScore,
} from "./client";
import {
  emitScoreEvent,
  onScoreEvent,
  type ScoreEvent,
  type ScoreListener,
} from "./events";
import { RECORDED_FIXTURES } from "./fixtures";
import { startLiveStream } from "./stream";

export * from "./events";
export { RECORDED_FIXTURES } from "./fixtures";
export { watchLive } from "./live";
export { startLiveStream, stopLiveStream } from "./stream";
export { TxlineError, type TxlineFixture, type TxlineScore } from "./client";

/**
 * LIVE with replay fallback: World Cup fixtures from the real TxLINE devnet
 * feed; when the feed (or its auth chain) is unreachable, the seeded demo
 * fixtures so the product keeps working after the matches end.
 */
export async function getFixtures(): Promise<TxlineFixture[]> {
  try {
    const live = await fetchFixtures();
    if (live.length > 0) return live;
  } catch (err) {
    warnFallback("getFixtures", err);
  }
  const { MOCK_MATCHES } = await import("@/lib/mock");
  const now = Date.now();
  return MOCK_MATCHES.map((m) => ({
    fixtureId: m.fixtureId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    kickoffAt: new Date(now + m.kickoffInMin * 60_000),
    raw: { ...m, source: "replay" },
  }));
}

/**
 * LIVE with replay fallback: the current score of a fixture, from the real
 * snapshot endpoint or the recorded event stream's latest state.
 */
export async function getScore(
  fixtureId: string | number,
): Promise<TxlineScore | undefined> {
  try {
    return await fetchScore(fixtureId);
  } catch (err) {
    warnFallback(`getScore(${fixtureId})`, err);
  }
  const events = RECORDED_FIXTURES[String(fixtureId)];
  const last = events?.[events.length - 1];
  if (!last) return undefined;
  return {
    fixtureId: last.fixtureId,
    home: last.home,
    away: last.away,
    minute: last.minute,
    finished: last.kind === "game_finalised",
    raw: { source: "replay" },
  };
}

/**
 * Subscribe to the score feed and start the live TxLINE stream. Listeners
 * receive identical events whether they come from the devnet SSE stream or
 * replayMatch; if live mode cannot come up, replay is the only source and
 * nothing breaks. Returns an unsubscribe fn.
 */
export function subscribeScores(cb: ScoreListener): () => void {
  const off = onScoreEvent(cb);
  void startLiveStream();
  return off;
}

let warnedFallback = false;
function warnFallback(what: string, err: unknown): void {
  if (warnedFallback) return;
  warnedFallback = true;
  console.warn(
    `[txline] ${what} falling back to replay data (${(err as Error).message})`,
  );
}

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
 * so replayed events carry event.matchId. The store is imported lazily and
 * failures are swallowed: replay stays fully offline-capable.
 */
async function resolveFixture(
  matchId: string | number,
): Promise<{ fixtureId: string; dbId?: number }> {
  const key = String(matchId);
  try {
    const { store } = await import("@/db/store");
    const byDbId = /^\d+$/.test(key) && !RECORDED_FIXTURES[key];
    const match = byDbId
      ? await store.findMatchById(Number(key))
      : await store.findMatchByFixture(key);
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
