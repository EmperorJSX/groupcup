import { emitScoreEvent } from "./events";

const ORIGIN =
  process.env.TXLINE_API_ORIGIN ?? "https://txline-dev.txodds.com";
const TOKEN = process.env.TXLINE_API_TOKEN;

/**
 * LIVE mode: poll the TxLINE devnet fixture endpoint and emit the same
 * ScoreEvents the replay produces, so downstream code never knows the
 * difference. Returns a stop function.
 *
 * ponytail: naive 5s HTTP poll with a guessed path; the demo runs on
 * replayMatch, and this is the single wiring point to update once the real
 * TxLINE endpoint list is confirmed for the submission docs.
 */
export function watchLive(
  fixtureId: string,
  opts: { pollMs?: number } = {},
): () => void {
  const pollMs = opts.pollMs ?? 5000;
  let last: { home: number; away: number } | undefined;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch(`${ORIGIN}/api/v1/fixtures/${fixtureId}`, {
        headers: TOKEN ? { authorization: `Bearer ${TOKEN}` } : undefined,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          home?: number;
          away?: number;
          minute?: number;
          status?: string;
        };
        const home = data.home ?? 0;
        const away = data.away ?? 0;
        const minute = data.minute ?? 0;
        if (!last) {
          await emitScoreEvent({ fixtureId, kind: "kickoff", minute, home, away });
        } else if (home !== last.home || away !== last.away) {
          await emitScoreEvent({
            fixtureId,
            kind: "goal",
            minute,
            home,
            away,
            team: home !== last.home ? "home" : "away",
          });
        }
        last = { home, away };
        if (data.status === "finished") {
          await emitScoreEvent({
            fixtureId,
            kind: "game_finalised",
            minute,
            home,
            away,
          });
          stopped = true;
          return;
        }
      }
    } catch {
      // Transient network error: keep polling.
    }
    if (!stopped) timer = setTimeout(tick, pollMs);
  };

  timer = setTimeout(tick, 0);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
