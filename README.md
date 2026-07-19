# groupcup

A Telegram-native World Cup prediction league for group chats.

Built for the TxLINE and Solana World Cup hackathon (Consumer and Fan Experiences track). Runs on Solana devnet.

## What it is

Add the groupcup bot to a Telegram group. Before each match it posts a prediction poll, locks it at kickoff, and scores the leaderboard live from the TxLINE score stream, right in the chat. Each player gets a Solana wallet as their identity with no seed-phrase friction, and a group can run an optional on-chain pot that the winner claims.

## How it works

1. The bot posts a prediction poll for the next match.
2. Predictions lock at kickoff.
3. As TxLINE score events arrive, the scoring engine updates points per prediction.
4. The leaderboard updates live in the group chat.
5. If a pot is enabled, the winner claims it on settlement.

A judge-testable demo mode replays a recorded match so the polls, scoring, and leaderboard run on demand.

## TxLINE endpoints used

- Guest auth: POST /auth/guest/start
- On-chain subscribe and token activation (free World Cup tier)
- Scores: snapshots and SSE stream (score events, final marker game_finalised)

## Tech stack

Next 16 (landing), Hono (bot webhook), grammy, Drizzle with Postgres, Redis, gill (Solana Kit). Solana devnet. Telegram HTML message formatting.

## Run locally

Prerequisites: Bun, Postgres, Redis, and a Telegram bot token.

1. Copy the env file and fill it in: `cp .env.example .env`
2. Install dependencies: `bun install`
3. Create the database schema: `bun run db:push`
4. Run the bot in long-poll mode for development: `bun run bot`
5. For production, set the webhook: `bun run set-webhook`
6. Run the demo replay: `bun run demo`

The landing page runs with `bun run dev`. The `context/` folder holds the full architecture and build plan.

## Links

Landing page: TBD. Demo video: TBD. Repo: https://github.com/EmperorJSX/groupcup
