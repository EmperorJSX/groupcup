import {
  getOrCreateGroup,
  getOrCreateUser,
  upsertPrediction,
  type Group,
  type User,
} from "@/db/queries";
import { store } from "@/db/store";
import { recomputeLeaderboard } from "@/scoring";
import { getOrCreateWallet } from "@/solana";
import {
  DEMO_CHAT_ID,
  DEMO_CHAT_TITLE,
  MOCK_MATCHES,
  MOCK_PLAYERS,
  MOCK_PREDICTIONS,
} from "./index";

export type SeededDemo = {
  group: Group;
  players: User[];
  /** fixtureId -> db match id */
  matchIds: Map<string, number>;
};

/**
 * Idempotent demo seed: players (each with a Solana identity), a demo group,
 * the mock matches, and everyone's predictions. Re-running resets the mock
 * matches to "scheduled" with fresh kickoffs, so `bun run demo` is repeatable.
 */
export async function seedDemo(
  chatId: string | number = DEMO_CHAT_ID,
  title = DEMO_CHAT_TITLE,
): Promise<SeededDemo> {
  const group = await getOrCreateGroup(chatId, title);

  const players: User[] = [];
  for (const p of MOCK_PLAYERS) {
    const user = await getOrCreateUser(p.tgId, p.name);
    await getOrCreateWallet(user.id);
    players.push(user);
  }
  const byTgId = new Map(players.map((u) => [u.userId, u]));

  const now = Date.now();
  const matchIds = new Map<string, number>();
  for (const m of MOCK_MATCHES) {
    const values = {
      fixtureId: m.fixtureId,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeFlag: m.homeFlag,
      awayFlag: m.awayFlag,
      kickoffAt: new Date(now + m.kickoffInMin * 60_000),
      status: "scheduled" as const,
      homeScore: 0,
      awayScore: 0,
      finalizedAt: null,
    };
    const row = await store.upsertMatch(values);
    matchIds.set(m.fixtureId, row.id);
  }
  // Re-open any polls left locked/settled by a previous demo run.
  await store.reopenPolls([...matchIds.values()]);

  for (const p of MOCK_PREDICTIONS) {
    const user = byTgId.get(p.tgId);
    const matchId = matchIds.get(p.fixtureId);
    if (!user || !matchId) continue;
    await upsertPrediction(group.id, user.id, matchId, p.pick);
  }

  await recomputeLeaderboard(group.id);
  return { group, players, matchIds };
}
