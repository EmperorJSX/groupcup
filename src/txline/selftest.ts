import assert from "node:assert/strict";
import { extractScore, normaliseFixture } from "./client";
import { onScoreEvent, type ScoreEvent } from "./events";
import { emitFromScore } from "./stream";

/**
 * Assert-based self-test for the TxLINE feed normalisation:
 * `bun run src/txline/selftest.ts`. The sample payloads are real devnet
 * responses (trimmed), captured 2026-07-20 from
 * /fixtures/snapshot and /scores/snapshot/18257739.
 */

// normaliseFixture: Participant1IsHome decides the home side
const fixtureRow = {
  Ts: 1784487600000,
  StartTime: 1784487900000,
  Competition: "World Cup",
  CompetitionId: 72,
  Participant1: "Spain",
  Participant2: "Argentina",
  FixtureId: 18257739,
  Participant1IsHome: true,
};
const fixture = normaliseFixture(fixtureRow)!;
assert.equal(fixture.fixtureId, "18257739");
assert.equal(fixture.homeTeam, "Spain");
assert.equal(fixture.awayTeam, "Argentina");
assert.equal(fixture.kickoffAt?.getTime(), 1784487900000);
const flipped = normaliseFixture({ ...fixtureRow, Participant1IsHome: false })!;
assert.equal(flipped.homeTeam, "Argentina");
assert.equal(flipped.awayTeam, "Spain");

// extractScore: goals from Score.*.Total.Goals, minute from Clock.Seconds
const goalEntry = {
  FixtureId: 18257739,
  Participant1IsHome: true,
  Action: "goal",
  Seq: 1256,
  Clock: { Running: true, Seconds: 6780 },
  Score: {
    Participant1: { Total: { Goals: 2, Corners: 9 } },
    Participant2: { Total: { YellowCards: 4, RedCards: 1 } },
  },
};
const goal = extractScore(goalEntry)!;
assert.equal(goal.fixtureId, "18257739");
assert.equal(goal.home, 2);
assert.equal(goal.away, 0); // no Goals key on Participant2 yet
assert.equal(goal.minute, 113);
assert.equal(goal.kind, "goal");
assert.equal(goal.seq, 1256);
assert.equal(goal.finished, false);

// Entries without a Score object still parse (0-0), non-objects do not
assert.equal(extractScore({ FixtureId: 1, Action: "comment", Seq: 2 })!.home, 0);
assert.equal(extractScore("nope"), undefined);
assert.equal(extractScore({ Action: "goal" }), undefined); // no fixture id

// game_finalised marker maps through
const final = extractScore({
  FixtureId: 18257739,
  Action: "game_finalised",
  Seq: 1400,
  Score: { Participant1: { Total: { Goals: 1 } }, Participant2: { Total: {} } },
})!;
assert.equal(final.finished, true);
assert.equal(final.kind, "game_finalised");

// emitFromScore: feed entries come out as the contract event sequence
const seen: ScoreEvent[] = [];
const off = onScoreEvent((e) => {
  if (e.fixtureId === "selftest-fx") seen.push(e);
});
const entry = (seq: number, action: string, p1Goals: number, p2Goals: number) =>
  extractScore({
    FixtureId: "selftest-fx",
    Action: action,
    Seq: seq,
    Score: {
      Participant1: { Total: { Goals: p1Goals } },
      Participant2: { Total: { Goals: p2Goals } },
    },
  })!;
await emitFromScore(entry(1, "kickoff", 0, 0));
await emitFromScore(entry(2, "possession", 0, 0)); // no event: nothing changed
await emitFromScore(entry(3, "goal", 1, 0));
await emitFromScore(entry(4, "action_amend", 1, 1)); // score change on amend = goal
await emitFromScore(entry(5, "halftime_finalised", 1, 1));
await emitFromScore(entry(6, "game_finalised", 1, 1));
await emitFromScore(entry(7, "game_finalised", 1, 1)); // duplicate final ignored
off();
assert.deepEqual(
  seen.map((e) => [e.kind, e.home, e.away, e.team ?? null]),
  [
    ["kickoff", 0, 0, null],
    ["goal", 1, 0, "home"],
    ["goal", 1, 1, "away"],
    ["half_time", 1, 1, null],
    ["game_finalised", 1, 1, null],
  ],
);

console.log("txline selftest: all assertions passed");
