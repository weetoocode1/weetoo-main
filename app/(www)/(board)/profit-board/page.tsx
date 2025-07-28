import { ShowcaseGrid } from "@/components/board/showcase-grid";
import { LeaderboardTable } from "@/components/board/leaderboard-table";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Profit Board | Weetoo",
  description:
    "Explore the Profit Board on Weetoo, where you can share and discover insights on financial success stories. Connect with experts and enthusiasts in a vibrant community.",
};

export default function ProfitBoard() {
  return (
    <div className="container flex flex-col gap-3 mx-auto py-6 pb-12 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-5 bg-muted/30 border border-border">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-0.5">
            Profit Board
          </h1>
          <p className="text-sm text-muted-foreground leading-snug max-w-lg">
            Share and discover insights on financial success stories. Connect
            with experts and enthusiasts in a vibrant community.
          </p>
        </div>
        <Link
          href="/create-post?board=profit"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 transition-colors text-base"
        >
          <PlusIcon size={18} />
          Create Post
        </Link>
      </div>
      <ShowcaseGrid board="profit-board" />
      <LeaderboardTable board="profit-board" />
    </div>
  );
}
