import Link from "next/link";
import {
  CircleCheck,
  Heart,
  ListChecks,
  Lock,
  Play,
  Send,
  Shield,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Flag, { type FlagCode } from "@/components/landing/Flag";
import {
  Footer,
  LiveDemoButton,
  Nav,
  TelegramButton,
} from "@/components/site/chrome";
import { ADD_TO_GROUP_URL, BOT_USERNAME, DEMO_URL } from "@/constants/site";

// mock: seeded fixtures; replace with TxLINE live data once the backend lands.
const MATCHES: {
  group: string;
  minute: string;
  home: FlagCode;
  homeScore: number;
  away: FlagCode;
  awayScore: number;
  stadium: string;
}[] = [
  { group: "Group A", minute: "45'", home: "QAT", homeScore: 1, away: "SEN", awayScore: 2, stadium: "Al Thumama Stadium" },
  { group: "Group B", minute: "HT", home: "ENG", homeScore: 2, away: "IRN", awayScore: 0, stadium: "Khalifa International Stadium" },
  { group: "Group C", minute: "70'", home: "ARG", homeScore: 3, away: "MEX", awayScore: 1, stadium: "Lusail Stadium" },
  { group: "Group D", minute: "20'", home: "FRA", homeScore: 0, away: "AUS", awayScore: 0, stadium: "Al Janoub Stadium" },
];

// mock: seeded chat messages for the hero visual.
const BUBBLES = [
  {
    name: "Alex",
    message: "Brazil to win it all! \u{1F3C6}",
    time: "11:20",
    read: false,
    bg: "bg-bubble-blue",
    nameColor: "text-primary",
    avatarBg: "bg-primary",
    pos: "right-[4%] top-0 w-56",
  },
  {
    name: "Maya",
    message: "France looking strong this year \u{1F1EB}\u{1F1F7}",
    time: "11:21",
    read: false,
    bg: "bg-bubble-cream",
    nameColor: "text-orange",
    avatarBg: "bg-orange",
    pos: "left-0 top-[30%] w-64",
  },
  {
    name: "Sam",
    message: "My dark horse pick: Morocco \u{1F525}",
    time: "11:22",
    read: false,
    bg: "bg-bubble-green",
    nameColor: "text-green",
    avatarBg: "bg-green",
    pos: "right-0 top-[42%] w-60",
  },
  {
    name: "You",
    message: "Let's go! Predictions in \u{1F525}",
    time: "11:23",
    read: true,
    bg: "bg-bubble-violet",
    nameColor: "text-violet",
    avatarBg: "bg-violet",
    pos: "right-[3%] bottom-0 w-72",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Add to Telegram",
    desc: "Add GroupCup bot to any group chat.",
    icon: Send,
    iconColor: "text-primary",
    blob: "bg-sky-soft",
  },
  {
    n: 2,
    title: "Make Predictions",
    desc: "Predict match outcomes and earn points.",
    icon: ListChecks,
    iconColor: "text-primary",
    blob: "bg-sky-soft",
  },
  {
    n: 3,
    title: "Compete & Win",
    desc: "Climb the leaderboard and beat your friends!",
    icon: Trophy,
    iconColor: "text-gold",
    blob: "bg-bubble-cream",
  },
];

const TRUST_BADGES = [
  { title: "100% Free", sub: "Always will be.", icon: Shield, color: "text-primary" },
  { title: "Safe & Secure", sub: "No data collected.", icon: Lock, color: "text-green" },
  { title: "Works in Any Group", sub: "Small or large.", icon: Users, color: "text-primary" },
  { title: "Real-Time Updates", sub: "Never miss a moment.", icon: Zap, color: "text-orange" },
  { title: "Built for Fans", sub: "By football lovers.", icon: Heart, color: "text-violet" },
];

const GROUP_FLOW = [
  {
    chip: `@${BOT_USERNAME}`,
    title: "Invite the bot",
    desc: "Open your Telegram group, tap Add Member, and pick the GroupCup bot.",
  },
  {
    chip: "/start",
    title: "Kick off your league",
    desc: "The bot registers the group and posts a prediction poll before every match.",
  },
  {
    chip: "/leaderboard",
    title: "Vote, score, brag",
    desc: "Everyone picks with one tap. Picks lock at kickoff, goals score in real time, the table settles it.",
  },
];

function GoldDashes() {
  return (
    <svg viewBox="0 0 34 44" className="w-7 shrink-0 text-gold" aria-hidden>
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none">
        <line x1="10" y1="10" x2="26" y2="4" />
        <line x1="12" y1="22" x2="30" y2="22" />
        <line x1="10" y1="34" x2="26" y2="40" />
      </g>
    </svg>
  );
}

function ChatBubble({ b }: { b: (typeof BUBBLES)[number] }) {
  return (
    <div
      className={`absolute z-10 flex items-start gap-2.5 rounded-2xl border border-border p-3.5 shadow-lg shadow-foreground/5 ${b.bg} ${b.pos}`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-primary-foreground ${b.avatarBg}`}
      >
        {b.name[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-extrabold ${b.nameColor}`}>{b.name}</span>
        <span className="block text-sm font-bold leading-snug">{b.message}</span>
        <span className="mt-0.5 block text-right text-[11px] font-bold text-faint-foreground">
          {b.time}
          {b.read && <span className="ml-1 text-primary">{"✓✓"}</span>}
        </span>
      </span>
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-10 lg:grid-cols-2 lg:pt-14">
      <div className="max-w-xl">
        <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl xl:text-[64px]">
          Predict the <span className="text-primary">World Cup</span> with your group chat
        </h1>
        <p className="mt-6 text-lg font-semibold text-muted-foreground">
          Fun, free and competitive.
          <br />
          Turn your group chat into a World Cup prediction league.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <TelegramButton className="px-7 py-4 text-lg" />
          <LiveDemoButton className="px-7 py-4 text-lg" />
          <GoldDashes />
        </div>
        <p className="mt-6 flex items-center gap-2.5 text-[15px] font-bold">
          <CircleCheck className="size-6 shrink-0 text-green" />
          Free to play {"•"} No sign up {"•"} Works in any group
        </p>
      </div>
      <div className="relative mx-auto h-[440px] w-full max-w-[660px] sm:h-[520px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/trophy-ball-t.png"
          alt="World Cup trophy and football"
          className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2"
        />
        {BUBBLES.map((b) => (
          <ChatBubble key={b.name} b={b} />
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-14">
      <h2 className="text-center text-4xl font-extrabold tracking-tight">How it works</h2>
      <div className="mt-12 flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        {STEPS.map((s, i) => (
          <div key={s.n} className="contents">
            {i > 0 && (
              <div className="hidden h-0 w-16 shrink-0 border-t-4 border-dotted border-sky-soft lg:block" />
            )}
            <div className="flex items-center gap-5">
              <span className={`flex size-20 shrink-0 items-center justify-center rounded-full ${s.blob}`}>
                <s.icon className={`size-9 ${s.iconColor}`} strokeWidth={2.2} />
              </span>
              <span>
                <span className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                    {s.n}
                  </span>
                  <span className="text-lg font-extrabold text-primary">{s.title}</span>
                </span>
                <span className="mt-1.5 block max-w-[230px] text-[15px] font-semibold leading-snug text-muted-foreground">
                  {s.desc}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddToGroup() {
  return (
    <section id="add-to-group" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-14">
      <div className="grid gap-10 rounded-3xl border border-border bg-card p-6 shadow-sm lg:grid-cols-2 lg:items-center lg:p-10">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Add it to your <span className="text-primary">group chat</span>
          </h2>
          <p className="mt-3 max-w-md text-[15px] font-semibold leading-relaxed text-muted-foreground">
            GroupCup lives inside Telegram. No app to install, no accounts to
            create: your group chat is the game.
          </p>
          <ol className="mt-7 space-y-6">
            {GROUP_FLOW.map((step, i) => (
              <li key={step.chip} className="flex items-start gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                  {i + 1}
                </span>
                <span>
                  <span className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[16px] font-extrabold">{step.title}</span>
                    <code className="rounded-lg bg-sky-soft px-2 py-0.5 text-[13px] font-extrabold text-primary">
                      {step.chip}
                    </code>
                  </span>
                  <span className="mt-1 block max-w-md text-[14px] font-semibold leading-snug text-muted-foreground">
                    {step.desc}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-3xl bg-sky-tint p-6 lg:p-8">
          <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-live">
            <span className="size-2.5 animate-pulse rounded-full bg-live" />
            TRY IT RIGHT NOW
          </p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight">
            No Telegram? The demo runs in your browser
          </h3>
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-muted-foreground">
            The full league loop, prediction poll, kickoff lock, live TxLINE
            goals, and a moving leaderboard, auto-plays on the real scoring
            engine. Zero setup.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={DEMO_URL}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[15px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              <Play className="size-4.5 fill-current" strokeWidth={1} /> Play the live demo
            </Link>
            <a
              href={ADD_TO_GROUP_URL}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-[15px] font-extrabold text-primary transition hover:bg-sky-soft"
            >
              <Send className="size-4.5 fill-current" strokeWidth={1} /> t.me/{BOT_USERNAME}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function MatchCard({ m }: { m: (typeof MATCHES)[number] }) {
  return (
    <div className="rounded-2xl border border-sky-soft bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-muted-foreground">{m.group}</span>
        <span className="font-extrabold text-primary">{m.minute}</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="flex flex-col items-center gap-1.5">
          <Flag code={m.home} />
          <span className="text-sm font-extrabold">{m.home}</span>
        </span>
        <span className="text-[26px] font-extrabold tabular-nums">
          {m.homeScore} - {m.awayScore}
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <Flag code={m.away} />
          <span className="text-sm font-extrabold">{m.away}</span>
        </span>
      </div>
      <p className="mt-3 text-center text-[13px] font-semibold text-faint-foreground">
        {m.stadium}
      </p>
    </div>
  );
}

function LiveScoring() {
  return (
    <section id="live" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-14">
      <div className="grid gap-6 rounded-3xl border border-sky-soft bg-sky-tint p-6 lg:grid-cols-[230px_1fr] lg:items-center lg:p-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-live">
            <span className="size-2.5 animate-pulse rounded-full bg-live" />
            LIVE NOW
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Live Scoring</h2>
          <p className="mt-2 text-[15px] font-semibold leading-snug text-muted-foreground">
            Real-time updates.
            <br />
            Real-time bragging rights.
          </p>
          <Link
            href="/leaderboard"
            className="mt-4 inline-flex items-center gap-2 text-[15px] font-extrabold text-primary transition hover:opacity-80"
          >
            <Trophy className="size-4.5" strokeWidth={2.4} /> See the league leaderboard
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MATCHES.map((m) => (
            <MatchCard key={m.group} m={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustBadges() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-16">
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-border">
        {TRUST_BADGES.map((t) => (
          <div key={t.title} className="flex items-center justify-center gap-3 lg:px-2">
            <t.icon className={`size-7 shrink-0 ${t.color}`} strokeWidth={2.2} />
            <span>
              <span className={`block text-[15px] font-extrabold ${t.color}`}>{t.title}</span>
              <span className="block text-[13px] font-semibold text-muted-foreground">
                {t.sub}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <AddToGroup />
        <LiveScoring />
        <TrustBadges />
      </main>
      <Footer />
    </>
  );
}
