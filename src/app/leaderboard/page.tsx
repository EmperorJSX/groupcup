import type { Metadata } from "next";
import LeaderboardView from "@/components/leaderboard/LeaderboardView";
import { Footer, Nav } from "@/components/site/chrome";

export const metadata: Metadata = {
  title: "GroupCup leaderboard: demo league standings",
  description:
    "Live standings for the groupcup demo league, scored by the real prediction engine on recorded TxLINE match data.",
};

export default function LeaderboardPage() {
  return (
    <>
      <Nav />
      <LeaderboardView />
      <Footer />
    </>
  );
}
