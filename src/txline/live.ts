import { fetchScore } from "./client";
import { emitFromScore } from "./stream";

/**
 * LIVE polling mode: poll the TxLINE score snapshot for one fixture and emit
 * the same ScoreEvents the replay produces. The SSE stream (./stream.ts) is
 * the primary live path; this is the single-fixture fallback when SSE is
 * unavailable. Returns a stop function.
 */
export function watchLive(
  fixtureId: string,
  opts: { pollMs?: number } = {},
): () => void {
  const pollMs = opts.pollMs ?? 5000;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;
    try {
      const score = await fetchScore(fixtureId);
      await emitFromScore(score);
      if (score.finished) {
        stopped = true;
        return;
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
