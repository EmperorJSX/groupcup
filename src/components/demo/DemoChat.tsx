"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, RotateCcw, Trophy } from "lucide-react";
import Flag from "@/components/landing/Flag";
import {
  FIXTURE_FLAGS,
  computeStandings,
  playerStyle,
  resultsFor,
} from "@/components/league/standings";
import Select from "@/components/ui/Select";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { MatchResult, Outcome, Standing } from "@/scoring/core";
import { RECORDED_FIXTURES } from "@/txline/fixtures";
import type { ScoreEvent } from "@/txline/events";
import {
  DEMO_CHAT_TITLE,
  MOCK_MATCHES,
  MOCK_PLAYERS,
  MOCK_PREDICTIONS,
} from "@/lib/mock";
import { sleep } from "@/utils/helper";

/**
 * Judge-facing web demo of the Telegram experience. Front-end mock, zero
 * config: it auto-plays the product loop on real product logic. Points come
 * from src/scoring, the event stream is the recorded TxLINE replay fixture,
 * players and picks are the seeded league from src/lib/mock, and the message
 * copy mirrors the real bot handlers (postMatchPolls, buildScoreMessage,
 * renderLeaderboard).
 */

const FIXTURE = "txl-wc26-final";
const MATCH = MOCK_MATCHES.find((m) => m.fixtureId === FIXTURE)!;
const EVENTS = RECORDED_FIXTURES[FIXTURE];
const [HOME_FLAG, AWAY_FLAG] = FIXTURE_FLAGS[FIXTURE];

const PICKS = new Map<string, Outcome>(
  MOCK_PREDICTIONS.filter((p) => p.fixtureId === FIXTURE).map((p) => [
    p.tgId,
    p.pick,
  ]),
);

/** Full-time results every player carries into the final: real engine math. */
const CARRIED_RESULTS = resultsFor(
  MOCK_MATCHES.filter((m) => m.fixtureId !== FIXTURE).map((m) => m.fixtureId),
);

/**
 * Provisional live standings, the same math recomputeLeaderboard runs: a live
 * match scores provisionally at the current scoreline, so the board moves on
 * every goal.
 */
function standingsAt(
  score: MatchResult | null,
  prevRanks?: ReadonlyMap<number, number>,
): Standing[] {
  const results = new Map(CARRIED_RESULTS);
  if (score) results.set(FIXTURE, score);
  return computeStandings(results, prevRanks);
}

type Msg =
  | { id: number; kind: "service"; text: string }
  | { id: number; kind: "member"; name: string; text: string; time: string }
  | { id: number; kind: "bot"; text: string; time: string }
  | { id: number; kind: "poll"; time: string }
  | { id: number; kind: "score"; event: ScoreEvent; time: string }
  | { id: number; kind: "board"; time: string };

type PollState = {
  votes: Record<Outcome, string[]>;
  closed: boolean;
};

/** Omit that distributes over the Msg union. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type NewMsg = DistributiveOmit<Msg, "id">;

type Speed = "1" | "2" | "3";
const SPEED_OPTIONS: { value: Speed; label: string }[] = [
  { value: "1", label: "Normal speed" },
  { value: "2", label: "Fast (2x)" },
  { value: "3", label: "Very fast (3x)" },
];

const OPTION_ORDER: Outcome[] = ["home", "draw", "away"];
const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
const ROW_H = 34;

function clockAt(totalMin: number): string {
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

/* ------------------------------- pieces -------------------------------- */

function MemberAvatar({ name }: { name: string }) {
  return (
    <span
      className={`flex size-8 shrink-0 select-none items-center justify-center rounded-full text-[13px] font-extrabold text-primary-foreground ${playerStyle(name).bg}`}
    >
      {name[0]}
    </span>
  );
}

// Icon avatar instead of the logo PNG: the PNG has a baked-in white
// background, this recolors with the theme.
function BotAvatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold">
      <Trophy className="size-4.5 text-primary-foreground" strokeWidth={2.4} />
    </span>
  );
}

function Bubble({
  avatar,
  children,
}: {
  avatar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="msg-in flex items-end gap-2 px-3">
      {avatar}
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border/60 bg-card px-3 py-2 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Stamp({ time }: { time: string }) {
  return (
    <span className="mt-0.5 block text-right text-[10px] font-bold text-faint-foreground">
      {time}
    </span>
  );
}

function ServicePill({ text }: { text: string }) {
  return (
    <p className="msg-in mx-auto w-fit max-w-[90%] rounded-full bg-foreground/10 px-3 py-1 text-center text-[12px] font-bold text-muted-foreground">
      {text}
    </p>
  );
}

function ScoreLine({ home, away }: { home: number; away: number }) {
  return (
    <span className="flex items-center gap-1.5 text-[14px] font-bold">
      <Flag code={HOME_FLAG} className="h-3.5 w-5" />
      {MATCH.homeTeam}
      <span className="mx-0.5 text-[15px] font-extrabold tabular-nums">
        {home} : {away}
      </span>
      {MATCH.awayTeam}
      <Flag code={AWAY_FLAG} className="h-3.5 w-5" />
    </span>
  );
}

function PollCard({ poll, time }: { poll: PollState; time: string }) {
  const total = OPTION_ORDER.reduce((n, o) => n + poll.votes[o].length, 0);
  const labels: Record<Outcome, React.ReactNode> = {
    home: (
      <span className="flex items-center gap-1.5">
        <Flag code={HOME_FLAG} className="h-3 w-4.5" /> {MATCH.homeTeam}
      </span>
    ),
    draw: <span>{"\u{1F91D}"} Draw</span>,
    away: (
      <span className="flex items-center gap-1.5">
        <Flag code={AWAY_FLAG} className="h-3 w-4.5" /> {MATCH.awayTeam}
      </span>
    ),
  };

  return (
    <div className="w-64 sm:w-72">
      <p className="flex items-center gap-1.5 text-[14px] font-extrabold">
        <Flag code={HOME_FLAG} className="h-3.5 w-5" />
        {MATCH.homeTeam} vs {MATCH.awayTeam}
        <Flag code={AWAY_FLAG} className="h-3.5 w-5" />
      </p>
      <p className="text-[12px] font-bold text-muted-foreground">
        {"⏰"} Today 18:00 UTC {"·"} Who wins?
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-faint-foreground">
        {poll.closed ? "Final results" : "Public poll"}
      </p>
      <div className="mt-2 space-y-2.5">
        {OPTION_ORDER.map((o) => {
          const voters = poll.votes[o];
          const pct = total ? Math.round((voters.length / total) * 100) : 0;
          return (
            <div key={o}>
              <div className="flex items-center justify-between gap-2 text-[13px] font-bold">
                {labels[o]}
                <span className="flex items-center gap-1.5">
                  <span className="flex -space-x-1.5">
                    {voters.slice(0, 3).map((name) => (
                      <span
                        key={name}
                        className={`flex size-4 items-center justify-center rounded-full text-[8px] font-extrabold text-primary-foreground ring-1 ring-card ${playerStyle(name).bg}`}
                      >
                        {name[0]}
                      </span>
                    ))}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{pct}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sky-soft">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] font-bold text-faint-foreground">
        {total === 0 ? "No votes yet" : `${total} vote${total === 1 ? "" : "s"}`}
        {poll.closed && " · Predictions locked"}
      </p>
      <Stamp time={time} />
    </div>
  );
}

function ScoreCard({
  event,
  time,
  onLeaderboard,
}: {
  event: ScoreEvent;
  time: string;
  onLeaderboard: () => void;
}) {
  const headline =
    event.kind === "full_time"
      ? "\u{1F4E3} FULL TIME"
      : `⚽ GOAL! ${event.minute}'`;
  return (
    <div className="w-60 sm:w-64">
      <p className="text-[14px] font-extrabold">{headline}</p>
      <div className="mt-1">
        <ScoreLine home={event.home} away={event.away} />
      </div>
      {event.kind === "goal" && event.scorer && (
        <p className="mt-0.5 text-[12px] font-semibold text-muted-foreground">
          {event.scorer} scores for {event.team === "home" ? MATCH.homeTeam : MATCH.awayTeam}
        </p>
      )}
      <Stamp time={time} />
      <button
        type="button"
        onClick={onLeaderboard}
        className="mt-1.5 w-full rounded-lg bg-primary/10 py-1.5 text-[13px] font-extrabold text-primary transition hover:bg-primary/15"
      >
        {"\u{1F3C6}"} Full leaderboard
      </button>
    </div>
  );
}

function BoardCard({
  rows,
  finished,
  time,
}: {
  rows: Standing[];
  finished: boolean;
  time: string;
}) {
  const champion = rows[0];
  return (
    <div className="w-64 sm:w-72">
      <p className="text-[14px] font-extrabold">
        {"\u{1F3C6}"} {finished ? "Final standings" : "Live standings"}
      </p>
      <div className="relative mt-1.5" style={{ height: rows.length * ROW_H }}>
        {rows.map((s, i) => (
          <div
            key={s.userId}
            className="absolute inset-x-0 flex items-center gap-2 transition-[top] duration-700 ease-out"
            style={{ top: i * ROW_H, height: ROW_H }}
          >
            <span className="w-6 shrink-0 text-center text-[13px] font-bold">
              {MEDALS[s.rank - 1] ?? `${s.rank}.`}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-[13px] ${s.rank <= 3 ? "font-extrabold" : "font-bold"}`}
            >
              {s.name}
            </span>
            <span className="shrink-0 text-[13px] font-extrabold tabular-nums">
              {s.points} pts
            </span>
            <span className="w-8 shrink-0 text-right text-[11px] font-extrabold">
              {s.delta > 0 && <span className="text-green">{"▲"}{s.delta}</span>}
              {s.delta < 0 && <span className="text-live">{"▼"}{-s.delta}</span>}
            </span>
          </div>
        ))}
      </div>
      {finished && champion && (
        <p className="mt-2 text-[13px] font-bold">
          {"\u{1F451}"} <span className="font-extrabold">{champion.name}</span> leads
          the pack with {champion.points} pts!
        </p>
      )}
      <Stamp time={time} />
    </div>
  );
}

function SkeletonChat() {
  const rows = [
    { side: "l", w: "w-48" },
    { side: "l", w: "w-64" },
    { side: "l", w: "w-40" },
    { side: "l", w: "w-56" },
  ];
  return (
    <div className="space-y-3 px-3 pt-4">
      <div className="mx-auto h-6 w-20 animate-pulse rounded-full bg-foreground/8" />
      {rows.map((r, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-foreground/8" />
          <div className={`h-12 animate-pulse rounded-2xl rounded-bl-md bg-foreground/8 ${r.w}`} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- demo --------------------------------- */

export default function DemoChat() {
  const [runId, setRunId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subtitle, setSubtitle] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [poll, setPoll] = useState<PollState | null>(null);
  const [board, setBoard] = useState<Standing[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1");
  const speedRef = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  const changeSpeed = (v: Speed) => {
    setSpeed(v);
    speedRef.current = Number(v);
  };

  const scrollToEnd = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

  useEffect(() => {
    scrollToEnd();
  }, [messages, poll, board, loading]);

  useEffect(() => {
    let alive = true;
    let seq = 0;
    let clock = 17 * 60 + 54;

    const push = (m: NewMsg) => {
      const withId = { ...m, id: ++seq } as Msg;
      setMessages((prev) => [...prev, withId]);
    };
    // The board stays the last message while the match is live, so score
    // cards and half-time pills slot in above it and its rows animate in
    // place while goals stream.
    const pushAboveBoard = (m: Msg) => {
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.kind === "board");
        if (idx < 0) return [...prev, m];
        return [...prev.slice(0, idx), m, ...prev.slice(idx)];
      });
    };
    const tick = (mins = 1) => clockAt((clock += mins));
    const wait = async (ms: number) => {
      await sleep(ms / speedRef.current);
      return alive;
    };

    const run = async () => {
      setLoading(true);
      setMessages([]);
      setPoll(null);
      setBoard(null);
      setFinished(false);
      setSubtitle(`${MOCK_PLAYERS.length} members, ${MOCK_PLAYERS.length} online`);

      // Where the real app would fetch chat history.
      if (!(await wait(1200))) return;
      setLoading(false);

      push({ kind: "service", text: "Today" });
      if (!(await wait(500))) return;
      push({ kind: "member", name: "Maya", text: "Final day! Who takes the cup? \u{1F3C6}", time: tick() });
      if (!(await wait(900))) return;
      push({ kind: "member", name: "Diego", text: "Brazil. Not even close \u{1F60E}", time: tick() });
      if (!(await wait(900))) return;
      push({ kind: "member", name: "Leo", text: "Argentina have Messi. Enough said \u{1F410}", time: tick() });
      if (!(await wait(1100))) return;

      // The bot posts the prediction poll, then its summary message
      // (mirrors postMatchPolls in src/bot/handler/matches.ts).
      setSubtitle("groupcup bot is typing...");
      if (!(await wait(900))) return;
      setPoll({ votes: { home: [], draw: [], away: [] }, closed: false });
      push({ kind: "poll", time: tick() });
      if (!(await wait(700))) return;
      push({
        kind: "bot",
        text:
          "⚽ 1 prediction poll posted!\n" +
          "Tap your pick. Predictions lock at kickoff.\n" +
          "Correct outcome scores points, /leaderboard shows the standings.",
        time: tick(0),
      });
      setSubtitle(`${MOCK_PLAYERS.length} members, ${MOCK_PLAYERS.length} online`);
      if (!(await wait(900))) return;

      // Members vote, one by one.
      for (const player of MOCK_PLAYERS) {
        const pick = PICKS.get(player.tgId);
        if (!pick) continue;
        setPoll((prev) =>
          prev
            ? { ...prev, votes: { ...prev.votes, [pick]: [...prev.votes[pick], player.name] } }
            : prev,
        );
        if (!(await wait(450))) return;
      }
      push({ kind: "member", name: "Amara", text: "Draw and penalties. Trust me \u{1F91D}", time: tick() });
      if (!(await wait(1600))) return;

      // Stream the recorded TxLINE fixture. First event locks the match,
      // every event rescores the board (same flow as src/bot/live.ts).
      let prevRanks = new Map(standingsAt(null).map((s) => [s.userId, s.rank]));
      const updateBoard = (score: MatchResult) => {
        const next = standingsAt(score, prevRanks);
        prevRanks = new Map(next.map((s) => [s.userId, s.rank]));
        setBoard(next);
        return next;
      };

      for (const event of EVENTS) {
        const time = clockAt(18 * 60 + Math.min(event.minute, 120));
        if (event.kind === "kickoff") {
          setPoll((prev) => (prev ? { ...prev, closed: true } : prev));
          push({
            kind: "service",
            text: `\u{1F512} Kick-off! Predictions locked. TxLINE feed connected.`,
          });
          setSubtitle("match live, streaming TxLINE events");
          if (!(await wait(900))) return;
          updateBoard({ home: event.home, away: event.away });
          push({ kind: "board", time });
        } else if (event.kind === "goal" || event.kind === "full_time") {
          updateBoard({ home: event.home, away: event.away });
          pushAboveBoard({ kind: "score", event, time, id: ++seq } as Msg);
        } else if (event.kind === "half_time") {
          pushAboveBoard({
            kind: "service",
            text: `⏸ Half-time. ${MATCH.homeTeam} ${event.home} : ${event.away} ${MATCH.awayTeam}`,
            id: ++seq,
          });
        } else if (event.kind === "game_finalised") {
          updateBoard({ home: event.home, away: event.away });
          setFinished(true);
          push({ kind: "service", text: "Match finalised. Points are settled." });
          setSubtitle("demo complete, tap replay to run it again");
        }
        if (!(await wait(event.kind === "kickoff" ? 1600 : 2300))) return;
      }
    };

    void run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const replay = () => setRunId((r) => r + 1);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-10 lg:flex-row lg:gap-16 lg:px-6 lg:py-10">
      <aside className="hidden max-w-sm shrink-0 lg:block">
        <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-live">
          <span className="size-2.5 animate-pulse rounded-full bg-live" />
          LIVE DEMO
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">
          The <span className="text-primary">groupcup</span> bot, right in your browser
        </h1>
        <p className="mt-4 text-[15px] font-semibold leading-relaxed text-muted-foreground">
          No Telegram account needed. This demo auto-plays a full match day in a
          group chat: the bot posts a prediction poll, picks lock at kickoff,
          TxLINE score events stream in, and the leaderboard moves live.
        </p>
        <ul className="mt-5 space-y-2.5 text-[14px] font-bold">
          {[
            "Runs the real scoring engine, not a video",
            "Recorded TxLINE event stream, replayed on demand",
            "Same messages the Telegram bot sends",
          ].map((line) => (
            <li key={line} className="flex items-center gap-2.5">
              <CircleCheck className="size-5 shrink-0 text-green" />
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-extrabold text-primary-foreground transition hover:opacity-90"
          >
            <RotateCcw className="size-4.5" /> Replay demo
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-soft px-5 py-3 text-[15px] font-extrabold text-primary transition hover:bg-sky-tint"
          >
            <ArrowLeft className="size-4.5" /> Back to site
          </Link>
          <ThemeToggle className="size-12 rounded-xl border border-border bg-card text-foreground hover:bg-sky-tint" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[14px] font-bold text-muted-foreground">Playback</span>
          <Select
            value={speed}
            onChange={changeSpeed}
            options={SPEED_OPTIONS}
            ariaLabel="Playback speed"
            className="w-44"
          />
        </div>
      </aside>

      <div className="flex h-dvh w-full flex-col overflow-hidden bg-sky-tint lg:h-[min(780px,88dvh)] lg:w-[420px] lg:rounded-[2rem] lg:border lg:border-border lg:shadow-xl lg:shadow-foreground/10">
        <header className="flex shrink-0 items-center gap-3 bg-primary px-3 py-2.5 text-primary-foreground">
          <Link href="/" aria-label="Back to landing" className="rounded-full p-1 transition hover:bg-primary-foreground/10 lg:hidden">
            <ArrowLeft className="size-5" />
          </Link>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold">
            <Trophy className="size-5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-extrabold">
              {DEMO_CHAT_TITLE}
            </span>
            <span className="block truncate text-[12px] font-semibold text-primary-foreground/75">
              {subtitle}
            </span>
          </span>
          <ThemeToggle className="rounded-full p-2 text-primary-foreground hover:bg-primary-foreground/10" />
          <button
            type="button"
            onClick={replay}
            aria-label="Replay demo"
            className="rounded-full p-2 transition hover:bg-primary-foreground/10"
          >
            <RotateCcw className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto pb-4 pt-3">
          {loading ? (
            <SkeletonChat />
          ) : (
            messages.map((m) => {
              switch (m.kind) {
                case "service":
                  return <ServicePill key={m.id} text={m.text} />;
                case "member": {
                  return (
                    <Bubble key={m.id} avatar={<MemberAvatar name={m.name} />}>
                      <span className={`block text-[13px] font-extrabold ${playerStyle(m.name).text}`}>
                        {m.name}
                      </span>
                      <span className="block text-[14px] font-semibold leading-snug">
                        {m.text}
                      </span>
                      <Stamp time={m.time} />
                    </Bubble>
                  );
                }
                case "bot":
                  return (
                    <Bubble key={m.id} avatar={<BotAvatar />}>
                      <span className="block text-[13px] font-extrabold text-primary">
                        groupcup <span className="font-bold text-faint-foreground">bot</span>
                      </span>
                      <span className="block whitespace-pre-line text-[14px] font-semibold leading-snug">
                        {m.text}
                      </span>
                      <Stamp time={m.time} />
                    </Bubble>
                  );
                case "poll":
                  return poll ? (
                    <Bubble key={m.id} avatar={<BotAvatar />}>
                      <PollCard poll={poll} time={m.time} />
                    </Bubble>
                  ) : null;
                case "score":
                  return (
                    <Bubble key={m.id} avatar={<BotAvatar />}>
                      <ScoreCard event={m.event} time={m.time} onLeaderboard={scrollToEnd} />
                    </Bubble>
                  );
                case "board":
                  return board ? (
                    <Bubble key={m.id} avatar={<BotAvatar />}>
                      <BoardCard rows={board} finished={finished} time={m.time} />
                    </Bubble>
                  ) : null;
              }
            })
          )}
          {finished && (
            <div className="msg-in px-3 pt-1">
              <button
                type="button"
                onClick={replay}
                className="mx-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90"
              >
                <RotateCcw className="size-4" /> Replay the demo
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </main>
  );
}
