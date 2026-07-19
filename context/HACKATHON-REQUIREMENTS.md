# Hackathon requirements (LOCKED, build to this)

This file is the binding spec for the build. Coding agents: follow it exactly. Do not display prize amounts anywhere public.

## Event
TxLINE and Solana World Cup Hackathon (Superteam Earn). Deadline 2026-07-19 23:59 UTC. Solana devnet is fine. TxLINE must be the PRIMARY data source. The deployed URL lives on a groupcup.emperorjs.com subdomain.

## Track: Consumer and Fan Experiences
Build a fan-facing product on TxLINE live World Cup data. Focus on clarity of use case and quality of execution over scope. A mainstream, non-technical sports fan should want to open and use it.

## Judging criteria (optimize for these)
1. Fan Accessibility and UX: engaging, intuitive, and polished enough that a mainstream non-technical fan would regularly use it.
2. Real-Time Responsiveness: updates fluidly based on what is actively happening in the match.
3. Originality and Value Creation: a genuinely new fan experience, not a repackaged feed.
4. Commercial and Monetization Path: a clear, viable business or monetization model (pot rake, premium leagues).
5. Completeness and Execution: a functional, complete end-to-end feature, even if the scope is deliberately small.

## Submission requirements (all must be satisfiable)
- Demo video up to 5 minutes: the problem, a live walkthrough, and how TxLINE powers the backend. Absolute screening requirement.
- Public repo: github.com/EmperorJSX/groupcup.
- A working deployed link OR a functional API endpoint the judges can test themselves.
- Brief technical documentation: core idea, technical highlights, and the exact list of TxLINE endpoints used.
- A short note on the TxLINE API experience.

## Do not get disqualified
- Ship a functional product, not a mockup.
- Use TxLINE data as a live input AND sign up through Solana (each player gets a Solana identity).
- Submit before the deadline.

## CRITICAL: judge-testability (this is where most teams fail)
Matches END at the deadline, so judges test AFTER the live feed is gone. Judges also may not want to add a Telegram bot to a real group. This project MUST make testing trivial:
- `bun run demo` replays a recorded match so polls lock, TxLINE score events stream in, points update, and the leaderboard moves, all on demand.
- Provide a public demo path that does NOT require the judge to set anything up: a hosted demo (a public test group they can open, or a web page that shows the bot loop running on replay). A judge should see the full experience in under a minute without creating a group.
- The README must include a "Test it in 60 seconds" section written for judges.

## Easy to test and showcase (hard requirement)
- One command locally (`bun run demo`), one obvious way to see it live without friction.
- Deterministic replay so the demo video is crisp and repeatable.
- Seeded players and predictions so the leaderboard is never empty.
- A clear happy path: a poll appears, predictions lock at kickoff, scores stream from TxLINE, the leaderboard updates live in the chat.
- Bonus to pursue if time allows: TTS voice-note pundit reactions on big moments (the brief offers bonus points for TTS).
