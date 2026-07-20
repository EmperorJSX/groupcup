"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play, Trophy } from "lucide-react";
import Flag from "@/components/landing/Flag";
import Select from "@/components/ui/Select";
import {
  FIXTURE_FLAGS,
  computeStandings,
  correctPicks,
  fullTimeScore,
  playerStyle,
  resultsFor,
} from "@/components/league/standings";
import { MOCK_MATCHES } from "@/lib/mock";
import { DEMO_URL } from "@/constants/site";

/**
 * Web leaderboard for the demo league: real engine scoring over the recorded
 * TxLINE results, filterable by stage. Zero config, no network.
 */

const STAGES = MOCK_MATCHES.map((m, i) => ({
  value: m.fixtureId,
  label:
    i === MOCK_MATCHES.length - 1
      ? "Final standings"
      : `After ${m.homeTeam} vs ${m.awayTeam}`,
}));

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

function MatchResultCard({ fixtureId }: { fixtureId: string }) {
  const match = MOCK_MATCHES.find((m) => m.fixtureId === fixtureId)!;
  const score = fullTimeScore(fixtureId);
  const [homeFlag, awayFlag] = FIXTURE_FLAGS[fixtureId];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-center text-[12px] font-extrabold uppercase tracking-wide text-faint-foreground">
        Full time
      </p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="flex flex-col items-center gap-1.5">
          <Flag code={homeFlag} />
          <span className="text-sm font-extrabold">{match.homeTeam}</span>
        </span>
        <span className="text-[24px] font-extrabold tabular-nums">
          {score.home} - {score.away}
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <Flag code={awayFlag} />
          <span className="text-sm font-extrabold">{match.awayTeam}</span>
        </span>
      </div>
    </div>
  );
}

function SkeletonBoard() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-7 animate-pulse rounded-full bg-foreground/8" />
          <div className="size-9 animate-pulse rounded-full bg-foreground/8" />
          <div className="h-4 flex-1 animate-pulse rounded-full bg-foreground/8" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-foreground/8" />
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardView() {
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(STAGES[STAGES.length - 1].value);

  // Where the real app would fetch the leaderboard from the engine API.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const { rows, results, playedIds } = useMemo(() => {
    const upTo = MOCK_MATCHES.findIndex((m) => m.fixtureId === stage) + 1;
    const playedIds = MOCK_MATCHES.slice(0, upTo).map((m) => m.fixtureId);
    const results = resultsFor(playedIds);
    const prev =
      upTo > 1
        ? new Map(
            computeStandings(resultsFor(playedIds.slice(0, -1))).map((s) => [
              s.userId,
              s.rank,
            ]),
          )
        : undefined;
    return { rows: computeStandings(results, prev), results, playedIds };
  }, [stage]);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
      <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-gold">
        <Trophy className="size-4.5" strokeWidth={2.4} />
        DEMO LEAGUE
      </p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Leaderboard</h1>
      <p className="mt-3 max-w-xl text-[15px] font-semibold leading-relaxed text-muted-foreground">
        Standings from the groupcup demo league, computed by the real scoring
        engine on recorded TxLINE match data. Correct outcome scores 3 points.
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Standings</h2>
          <Select
            value={stage}
            onChange={setStage}
            options={STAGES}
            ariaLabel="Show standings after match"
            className="w-64"
          />
        </div>
        <div className="mt-5">
          {loading ? (
            <SkeletonBoard />
          ) : (
            <ol className="divide-y divide-border">
              {rows.map((s) => {
                const correct = correctPicks(s.name, results);
                return (
                  <li key={s.userId} className="flex items-center gap-3 py-2.5">
                    <span className="w-7 shrink-0 text-center text-[15px] font-bold">
                      {MEDALS[s.rank - 1] ?? `${s.rank}.`}
                    </span>
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-primary-foreground ${playerStyle(s.name).bg}`}
                    >
                      {s.name[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[15px] ${s.rank <= 3 ? "font-extrabold" : "font-bold"}`}>
                        {s.name}
                      </span>
                      <span className="block text-[12px] font-semibold text-faint-foreground">
                        {correct} of {playedIds.length} correct
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-extrabold tabular-nums">
                      {s.points} pts
                    </span>
                    <span className="w-9 shrink-0 text-right text-[12px] font-extrabold">
                      {s.delta > 0 && <span className="text-green">{"▲"}{s.delta}</span>}
                      {s.delta < 0 && <span className="text-live">{"▼"}{-s.delta}</span>}
                      {s.delta === 0 && <span className="text-faint-foreground">-</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-lg font-extrabold">Results from TxLINE</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-foreground/8" />
            ))
          : playedIds.map((id) => <MatchResultCard key={id} fixtureId={id} />)}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-sky-tint p-6">
        <p className="text-[15px] font-bold">
          Watch these points get scored goal by goal, live in your browser.
        </p>
        <Link
          href={DEMO_URL}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-extrabold text-primary-foreground transition hover:opacity-90"
        >
          <Play className="size-4.5 fill-current" strokeWidth={1} /> Play the demo
        </Link>
      </div>
    </main>
  );
}
