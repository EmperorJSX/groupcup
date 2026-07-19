import type { Metadata } from "next";
import DemoChat from "@/components/demo/DemoChat";

export const metadata: Metadata = {
  title: "GroupCup live demo: the Telegram bot in your browser",
  description:
    "Auto-playing demo of the groupcup Telegram bot: prediction poll, kickoff lock, live TxLINE score events, and a leaderboard that moves in real time.",
};

export default function DemoPage() {
  return <DemoChat />;
}
