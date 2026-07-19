# groupcup bot build: coordination doc for the two agents

Two agents build the groupcup Telegram bot in parallel. This doc is the contract so your work composes cleanly. The LANDING page is already built and MUST NOT be touched (src/app/page.tsx, layout.tsx, globals.css, src/components/landing).

## Architecture (learn from jomo at /home/ubuntu/projects/jomo)
- grammy bot. Production receives updates via a Hono webhook at POST /api/tg-bot; dev uses long polling (src/bot/index.ts, run with `bun run bot`). This is jomo's pattern.
- Copy and adapt from jomo: src/bot/{classes,handler,register,index.ts}, src/config/{bot,env,redis,rate-limiter}.ts, src/constants/{bot,emoji}.ts, src/router/{api,health}.ts, src/app/api/[[...route]]/route.ts, scripts/bot.ts.
- Strip jomo's crypto-token domain: GeckoTerminal, PriceCache, Monitor, Token, TokenResolver, ChainNames. Keep Bot, Context, Session, TeleError, Fmt.
- Fmt: convert jomo's src/bot/classes/Fmt.ts from MarkdownV2 to an HTML builder. parse_mode HTML; escape only the three chars & < > ; tags <b> <i> <u> <s> <code> <a href> <blockquote>; keep the same builder API.
- The Next landing app MUST still boot with zero config. Guard the bot so importing it does not require a token at build or render time (the bot only needs a token when `bun run bot` runs). Do not break `bun run dev`.

## File ownership (strict, disjoint)
- Agent groupcup-bot owns: src/bot/**, src/config/**, src/constants/**, src/router/**, src/app/api/**, scripts/bot.ts. It IMPORTS the engine modules below. It owns package.json and dependency install.
- Agent groupcup-engine owns: src/db/**, src/scoring/**, src/txline/**, src/solana/**, src/lib/** (game mock data + fixtures). It does NOT edit package.json or run install (the bot agent installs).
- Neither touches the landing files listed at the top.

## The contract (both build to these exact signatures)
The engine (groupcup-engine implements, groupcup-bot imports):
- @/db : Drizzle schema (users, groups, predictions, matches, leaderboards) + async helpers:
    getOrCreateUser(tgId, name) -> User ; getOrCreateGroup(chatId, title) -> Group ;
    upsertPrediction(groupId, userId, matchId, pick) -> void ;
    getLeaderboard(groupId) -> Array<{ name, points, rank, delta }> ;
    listOpenMatches() -> Match[] ; lockMatch(matchId) -> void
- @/scoring : pure functions  scorePrediction(pick, result) -> number ;  recomputeLeaderboard(groupId) -> LeaderRow[]
- @/txline : score feed with live + replay for the demo.  onScoreEvent(cb) ;  replayMatch(matchId) ;  final marker game_finalised
- @/solana : getOrCreateWallet(userId) -> { pubkey }  (custodial, mock keypair for now, gill v2)
- @/lib/mock : seeded World Cup matches, teams, flags, sample predictions

## Game flow the bot implements
/start and add-to-group onboarding, bot posts a prediction poll per upcoming match, users pick, poll locks at kickoff (lockMatch), as txline score events arrive scoring updates points, bot posts the live leaderboard in the chat, and /leaderboard shows standings.

## Rules for both
- No em dashes. Bun-first. gill for any Solana (v2, not v1). Drizzle + postgres for db (schema and queries just need to compile and be correct, a real DB is tested later).
- The user will TEST later. Build to completion, self-test what you can (tsc your own files, unit-test scoring), and keep going until you believe it is finished. Do NOT run the full next build or Playwright.
- Do NOT git commit and do NOT push. The lead integrates and commits after both finish.
- Report via  bash /home/ubuntu/projects/_fleet/fleet.sh note <your-slug> progress "<status>"  at milestones, keep your fleet todo.md ticked, and post a done note when finished.
