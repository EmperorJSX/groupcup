import { emitScoreEvent, type ScoreEvent } from "./events";
import { authHeaders, extractScore, txlineApiBase, type TxlineScore } from "./client";

/**
 * LIVE mode: consume the TxLINE SSE score stream and emit the exact same
 * ScoreEvents the replay produces, so downstream code never knows the
 * difference. Event kinds are synthesised by diffing consecutive scores per
 * fixture (first sight = kickoff, score change = goal, finished =
 * game_finalised), which keeps us independent of the feed's own grammar.
 */

const lastByFixture = new Map<string, TxlineScore>();

/**
 * Turn a normalised feed entry into contract ScoreEvents. The feed's own
 * action grammar supplies kickoff / half_time / game_finalised directly;
 * goals (including score amendments on other actions) are detected by
 * diffing against the last seen score per fixture.
 */
export async function emitFromScore(score: TxlineScore): Promise<void> {
  const last = lastByFixture.get(score.fixtureId);
  const base = {
    fixtureId: score.fixtureId,
    minute: score.minute ?? 0,
    home: score.home,
    away: score.away,
  };
  const changed =
    last != null && (score.home !== last.home || score.away !== last.away);
  if (score.kind === "kickoff" || last == null) {
    await emitScoreEvent({ ...base, kind: "kickoff" });
    // First sight of an already-finished fixture still ends with the marker.
    if (score.finished) await emitScoreEvent({ ...base, kind: "game_finalised" });
  } else if (score.kind === "half_time") {
    await emitScoreEvent({ ...base, kind: "half_time" });
  } else if (score.kind === "game_finalised") {
    if (!last.finished) await emitScoreEvent({ ...base, kind: "game_finalised" });
  } else if (changed) {
    await emitScoreEvent({
      ...base,
      kind: "goal",
      team: score.home !== last.home ? "home" : "away",
    });
  }
  lastByFixture.set(score.fixtureId, {
    ...score,
    finished: score.finished || last?.finished,
  });
}

/** Parse one SSE frame's data lines into JSON payloads (bad JSON skipped). */
function parseFrame(frame: string): { id?: string; payloads: unknown[] } {
  let id: string | undefined;
  const payloads: unknown[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("id:")) id = line.slice(3).trim();
    if (!line.startsWith("data:")) continue;
    const text = line.slice(5).trim();
    if (!text) continue;
    try {
      payloads.push(JSON.parse(text));
    } catch {
      // Non-JSON keepalive or comment; ignore.
    }
  }
  return { id, payloads };
}

let started = false;
let stopped = false;

/**
 * Open GET /api/scores/stream and keep it open, reconnecting with backoff
 * and Last-Event-ID resume. Returns true when the stream (and the auth +
 * on-chain activation behind it) came up; false when live mode is off or
 * the first connection failed. Failures never throw past this function:
 * replay mode remains the fallback.
 */
export async function startLiveStream(): Promise<boolean> {
  if (process.env.TXLINE_OFFLINE === "1") return false;
  if (started) return true;
  let lastEventId: string | undefined;

  const connect = async (): Promise<void> => {
    const headers: Record<string, string> = {
      ...(await authHeaders()),
      accept: "text/event-stream",
      "accept-encoding": "deflate",
    };
    if (lastEventId) headers["last-event-id"] = lastEventId;
    const res = await fetch(`${txlineApiBase}/scores/stream`, { headers });
    if (!res.ok || !res.body) {
      throw new Error(`scores/stream failed: ${res.status}`);
    }
    console.log("[txline] live score stream connected");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const { id, payloads } = parseFrame(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
        if (id) lastEventId = id;
        for (const payload of payloads) {
          const entries = Array.isArray(payload) ? payload : [payload];
          for (const entry of entries) {
            const score = extractScore(entry);
            if (score) await emitFromScore(score);
          }
        }
      }
    }
  };

  // First connection synchronous-ish so callers learn whether live mode is up.
  try {
    await authHeaders();
  } catch (err) {
    console.warn(
      `[txline] live mode unavailable (${(err as Error).message}); staying on replay`,
    );
    return false;
  }

  started = true;
  stopped = false;
  void (async () => {
    let failures = 0;
    while (!stopped) {
      try {
        await connect();
        failures = 0; // stream ended cleanly; reconnect right away
      } catch (err) {
        failures += 1;
        if (failures === 1) {
          console.warn(`[txline] stream error: ${(err as Error).message}`);
        }
        if (failures >= 5) {
          console.warn("[txline] stream giving up after 5 failures; replay only");
          started = false;
          return;
        }
      }
      await new Promise((r) => setTimeout(r, Math.min(30_000, 1000 * 2 ** failures)));
    }
  })();
  return true;
}

/** Stop the live stream loop (tests and shutdown). */
export function stopLiveStream(): void {
  stopped = true;
  started = false;
}

export type { ScoreEvent };
