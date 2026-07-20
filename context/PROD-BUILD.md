# groupcup production build: 3 parallel agents (Consumer track: Telegram prediction league)

Goal: a real Telegram-native World Cup prediction league. The bot posts group prediction polls, locks at kickoff, scores from TxLINE, ranks a leaderboard, settles. Judge-testable web demo (matches ended, so replay). TxLINE MUST be a live input (with replay fallback). No em dashes. Everything type-safe, zero tsc errors. The Telegram bot is built very well but NOT run (token comes later; use placeholder env).

## File ownership (never edit outside your list; you cross-IMPORT, never co-edit)
- groupcup-bot: src/bot/**, src/config/**, src/constants/**, src/router/**, src/app/api/**, src/types/bot.ts. Owns package.json + `bun install`.
- groupcup-engine: src/scoring/**, src/txline/**, src/db/**, src/solana/**, src/lib/**, src/utils/**, src/types/** (except types/bot.ts)
- groupcup-web: src/app/** (except src/app/api), src/components/**, src/app/globals.css, src/app/layout.tsx, src/app/icon.png

## Contract (import, do not co-edit)
- engine:
  - TxLINE (real devnet + replay fallback): getFixtures(), getScore(fixtureId), subscribeScores(cb). Endpoints in context/HACKATHON-REQUIREMENTS.md. Wrap real calls with replay fallback; ship a recorded dataset so it works after matches end.
  - scoring (deterministic + documented): scorePrediction(pred, result), computeLeaderboard(groupId), settleMatch(fixtureId).
  - db: drizzle schema (groups, members, predictions, scores) + typed queries. If postgres is not reachable at build, keep it type-safe with an in-memory/sqlite driver so tsc passes and the demo runs zero-config.
- bot: COMPLETE the existing Bot/Context/Fmt scaffold in src/bot. Full flows: /start + group registration, /predict (create a prediction poll), capture votes via callback actions, lock at kickoff, push live score updates, /leaderboard, settlement messages. Read scores/leaderboard from the engine. Placeholder env in src/config/bot.ts (TG_BOT_TOKEN etc.). `bunx tsc --noEmit` = 0 errors. DO NOT run the bot.
- web: landing + /demo (auto-plays the full loop on engine scoring + replay TxLINE) + a web leaderboard. Dark mode. Custom <Select> (NO native select). Favicon (src/app/icon.png). Loading skeletons. Judge-testable with zero setup.

## Rules
- Bot: complete + type-safe, but do NOT run it (no token). Web demo boots zero-config. Real TxLINE + replay fallback. No native <select>. Leave ONE runnable check on the scoring math. tsc clean on your files. Do NOT git commit. Report via  bash /home/ubuntu/projects/_fleet/fleet.sh note <your-slug> progress "..."  and keep todo.md ticked. Build until your layer is production-ready.
