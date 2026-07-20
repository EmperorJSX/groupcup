import Link from "next/link";
import { Play, Send, Trophy } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { DEMO_URL, NAV_LINKS } from "@/constants/site";

/**
 * Shared site chrome for the landing and leaderboard pages. The brand mark is
 * icon + text (not the wordmark PNG) so it recolors with the theme.
 */

// The nav constants point Leaderboard at a landing anchor; the web app has a
// real page for it now.
const LINKS = NAV_LINKS.map((l) =>
  l.label === "Leaderboard" ? { ...l, href: "/leaderboard" } : l,
);

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="GroupCup home" className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary">
        <Trophy className="size-5.5 text-gold" strokeWidth={2.4} fill="currentColor" />
      </span>
      <span className="text-2xl font-extrabold tracking-tight">
        <span className="text-primary">group</span>
        <span className="text-gold">cup</span>
      </span>
    </Link>
  );
}

// Both CTAs open the in-browser demo so judges can test without a bot token.
export function TelegramButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href={DEMO_URL}
      className={`inline-flex items-center gap-2.5 rounded-xl bg-primary font-extrabold text-primary-foreground transition hover:opacity-90 ${className}`}
    >
      <Send className="size-[1.2em] fill-current" strokeWidth={1} />
      Add to Telegram
    </Link>
  );
}

export function LiveDemoButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href={DEMO_URL}
      className={`inline-flex items-center gap-2.5 rounded-xl bg-sky-soft font-extrabold text-primary transition hover:bg-sky-tint ${className}`}
    >
      <Play className="size-[1.1em] fill-current" strokeWidth={1} />
      Live Demo
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6">
        <BrandMark />
        <nav className="hidden items-center gap-9 text-[15px] font-bold lg:flex">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="transition hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="flex items-center gap-3">
          <ThemeToggle />
          <TelegramButton className="px-5 py-2.5 text-[15px]" />
        </span>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer id="faqs" className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-10 md:flex-row">
        <BrandMark />
        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm font-bold text-muted-foreground">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="transition hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-center text-[13px] font-semibold text-faint-foreground">
          {"©"} 2026 GroupCup. A fan-made game, not affiliated with FIFA.
        </p>
      </div>
    </footer>
  );
}
