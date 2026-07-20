"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Light/dark switch for the class-based theme. The no-flash init script in
 * layout.tsx sets the initial class from localStorage or prefers-color-scheme;
 * this button just flips and persists it. Icons swap via the dark: variant so
 * server and client markup always match.
 */
export default function ThemeToggle({
  className = "size-10 rounded-xl border border-border bg-card text-foreground hover:bg-sky-tint",
}: {
  className?: string;
}) {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // private mode: theme still flips for the session
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`inline-flex shrink-0 items-center justify-center transition ${className}`}
    >
      <Sun className="hidden size-5 dark:block" />
      <Moon className="size-5 dark:hidden" />
    </button>
  );
}
