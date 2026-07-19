import assert from "node:assert/strict";
import { OUTCOME_POINTS, outcomeOf, rankStandings, scorePrediction } from "./core";

/**
 * Assert-based self-test for the scoring math: `bun run src/scoring/selftest.ts`.
 * Kept off the *.test.ts glob on purpose so `bun test` (bot agent's suite) and
 * `next build` type-checking never need bun:test types.
 */

// outcomeOf
assert.equal(outcomeOf({ home: 2, away: 1 }), "home");
assert.equal(outcomeOf({ home: 0, away: 0 }), "draw");
assert.equal(outcomeOf({ home: 1, away: 3 }), "away");

// scorePrediction: correct outcome scores, everything else is 0
assert.equal(scorePrediction("home", { home: 2, away: 1 }), OUTCOME_POINTS);
assert.equal(scorePrediction("draw", { home: 2, away: 1 }), 0);
assert.equal(scorePrediction("away", { home: 2, away: 1 }), 0);
assert.equal(scorePrediction("draw", { home: 1, away: 1 }), OUTCOME_POINTS);
assert.equal(scorePrediction("away", { home: 0, away: 2 }), OUTCOME_POINTS);

// rankStandings: competition ranking, ties share a rank, next rank skips
const ranked = rankStandings([
  { userId: 1, name: "Maya", points: 6 },
  { userId: 2, name: "Leo", points: 9 },
  { userId: 3, name: "Ines", points: 6 },
  { userId: 4, name: "Kofi", points: 0 },
]);
assert.deepEqual(
  ranked.map((r) => [r.name, r.rank]),
  [
    ["Leo", 1],
    ["Ines", 2], // tie on 6 points, alphabetical for determinism
    ["Maya", 2],
    ["Kofi", 4], // "1224": rank 3 is skipped
  ],
);

// delta: positive = climbed, negative = dropped, new entrant = 0
const prev = new Map([
  [1, 1], // Maya was 1st, now 2nd -> delta -1
  [2, 3], // Leo was 3rd, now 1st -> delta +2
  [3, 2], // Ines was 2nd, now 2nd -> delta 0
]);
const moved = rankStandings(
  [
    { userId: 1, name: "Maya", points: 6 },
    { userId: 2, name: "Leo", points: 9 },
    { userId: 3, name: "Ines", points: 6 },
    { userId: 4, name: "Kofi", points: 0 },
  ],
  prev,
);
assert.deepEqual(
  moved.map((r) => [r.name, r.delta]),
  [
    ["Leo", 2],
    ["Ines", 0],
    ["Maya", -1],
    ["Kofi", 0],
  ],
);

// determinism: input order never changes the output
assert.deepEqual(
  rankStandings([
    { userId: 9, name: "A", points: 3 },
    { userId: 8, name: "A", points: 3 },
  ]),
  rankStandings([
    { userId: 8, name: "A", points: 3 },
    { userId: 9, name: "A", points: 3 },
  ]),
);

console.log("scoring selftest: all assertions passed");
