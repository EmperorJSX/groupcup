import { runDemo } from "@/lib/demo";

// `bun run demo`: the whole game loop on replay, no Telegram or network needed.
await runDemo();
process.exit(0);
