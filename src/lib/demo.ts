import { applyScoreEvent, getLeaderboard, lockMatch } from "@/db/queries";
import { activeDbBackend } from "@/db/store";
import { recomputeLeaderboard } from "@/scoring";
import { onScoreEvent, replayMatch } from "@/txline";
import { DEMO_FIXTURE } from "./mock";
import { seedDemo } from "./mock/seed";

function renderBoard(rows: Awaited<ReturnType<typeof getLeaderboard>>): string {
  return rows
    .map((r) => {
      const move = r.delta > 0 ? `up ${r.delta}` : r.delta < 0 ? `down ${-r.delta}` : "-";
      return `  ${String(r.rank).padStart(2)}. ${r.name.padEnd(8)} ${String(r.points).padStart(3)} pts  (${move})`;
    })
    .join("\n");
}

/**
 * The judge-facing happy path on the console, no Telegram required: seed the
 * league, lock the demo match at kickoff, stream the recorded TxLINE events,
 * and watch points and ranks move until game_finalised.
 */
export async function runDemo(): Promise<void> {
  console.log("groupcup demo: seeding league...");
  const { group, matchIds } = await seedDemo();
  const demoMatchId = matchIds.get(DEMO_FIXTURE)!;

  console.log(
    `Seeded group "${group.title}" with 8 players and 3 matches ` +
      `(db: ${activeDbBackend()}).\n`,
  );
  console.log("Kickoff. Predictions locked for the demo match.");
  await lockMatch(demoMatchId);

  const off = onScoreEvent(async (e) => {
    await applyScoreEvent(e);
    const board = await recomputeLeaderboard(group.id);
    const label =
      e.kind === "goal"
        ? `GOAL ${e.minute}' ${e.scorer ?? ""} (${e.home}-${e.away})`
        : `${e.kind} (${e.home}-${e.away})`;
    console.log(`\n[TxLINE] ${label}`);
    console.log(renderBoard(board));
  });

  await replayMatch(DEMO_FIXTURE);
  off();

  console.log("\nFull-time standings:");
  console.log(renderBoard(await getLeaderboard(group.id)));
  console.log("\nDemo complete: match finalised, leaderboard settled.");
}
