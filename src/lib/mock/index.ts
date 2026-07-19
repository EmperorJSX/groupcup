import type { MatchPick } from "@/db/queries";

/**
 * Seeded World Cup 2026 demo data. Fixture ids line up with the recorded
 * TxLINE replays in src/txline/fixtures.ts, so seeding + replayMatch gives a
 * full live-match experience with no network.
 */

export const DEMO_CHAT_ID = "-1002026071900";
export const DEMO_CHAT_TITLE = "groupcup demo league";
/** The match `bun run demo` locks and replays. */
export const DEMO_FIXTURE = "txl-wc26-sf1";

export type MockMatch = {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  /** Minutes from seed time until kickoff. */
  kickoffInMin: number;
};

export const MOCK_MATCHES: MockMatch[] = [
  {
    fixtureId: "txl-wc26-sf1",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeFlag: "🇦🇷",
    awayFlag: "🇫🇷",
    kickoffInMin: 2, // locks almost immediately: the match the demo replays
  },
  {
    fixtureId: "txl-wc26-sf2",
    homeTeam: "Brazil",
    awayTeam: "England",
    homeFlag: "🇧🇷",
    awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    kickoffInMin: 45,
  },
  {
    fixtureId: "txl-wc26-final",
    homeTeam: "Argentina",
    awayTeam: "Brazil",
    homeFlag: "🇦🇷",
    awayFlag: "🇧🇷",
    kickoffInMin: 180,
  },
];

export type MockPlayer = { tgId: string; name: string };

export const MOCK_PLAYERS: MockPlayer[] = [
  { tgId: "9000000001", name: "Maya" },
  { tgId: "9000000002", name: "Leo" },
  { tgId: "9000000003", name: "Ines" },
  { tgId: "9000000004", name: "Kofi" },
  { tgId: "9000000005", name: "Sofia" },
  { tgId: "9000000006", name: "Jonas" },
  { tgId: "9000000007", name: "Amara" },
  { tgId: "9000000008", name: "Diego" },
];

export type MockPrediction = { fixtureId: string; tgId: string; pick: MatchPick };

/**
 * Picks are spread so every replay produces winners, losers, and rank
 * movement (sf1 finishes 2-1 home, sf2 2-1 home, final 3-2 home).
 */
export const MOCK_PREDICTIONS: MockPrediction[] = [
  // sf1: Argentina v France (home win) -> Maya, Leo, Ines score
  { fixtureId: "txl-wc26-sf1", tgId: "9000000001", pick: "home" },
  { fixtureId: "txl-wc26-sf1", tgId: "9000000002", pick: "home" },
  { fixtureId: "txl-wc26-sf1", tgId: "9000000003", pick: "home" },
  { fixtureId: "txl-wc26-sf1", tgId: "9000000004", pick: "draw" },
  { fixtureId: "txl-wc26-sf1", tgId: "9000000005", pick: "draw" },
  { fixtureId: "txl-wc26-sf1", tgId: "9000000006", pick: "away" },
  { fixtureId: "txl-wc26-sf1", tgId: "9000000007", pick: "away" },
  { fixtureId: "txl-wc26-sf1", tgId: "9000000008", pick: "away" },
  // sf2: Brazil v England (home win) -> Kofi, Sofia, Diego score
  { fixtureId: "txl-wc26-sf2", tgId: "9000000001", pick: "away" },
  { fixtureId: "txl-wc26-sf2", tgId: "9000000002", pick: "draw" },
  { fixtureId: "txl-wc26-sf2", tgId: "9000000003", pick: "away" },
  { fixtureId: "txl-wc26-sf2", tgId: "9000000004", pick: "home" },
  { fixtureId: "txl-wc26-sf2", tgId: "9000000005", pick: "home" },
  { fixtureId: "txl-wc26-sf2", tgId: "9000000006", pick: "draw" },
  { fixtureId: "txl-wc26-sf2", tgId: "9000000007", pick: "away" },
  { fixtureId: "txl-wc26-sf2", tgId: "9000000008", pick: "home" },
  // final: Argentina v Brazil (home win) -> mixed, decides the title race
  { fixtureId: "txl-wc26-final", tgId: "9000000001", pick: "home" },
  { fixtureId: "txl-wc26-final", tgId: "9000000002", pick: "away" },
  { fixtureId: "txl-wc26-final", tgId: "9000000003", pick: "draw" },
  { fixtureId: "txl-wc26-final", tgId: "9000000004", pick: "home" },
  { fixtureId: "txl-wc26-final", tgId: "9000000005", pick: "away" },
  { fixtureId: "txl-wc26-final", tgId: "9000000006", pick: "home" },
  { fixtureId: "txl-wc26-final", tgId: "9000000007", pick: "draw" },
  { fixtureId: "txl-wc26-final", tgId: "9000000008", pick: "away" },
];
