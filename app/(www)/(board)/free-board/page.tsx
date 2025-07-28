import { LeaderboardTable } from "@/components/board/leaderboard-table";
import { ShowcaseGrid } from "@/components/board/showcase-grid";
import { PlusIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Bulletin Board | Weetoo",
  description:
    "Explore the Free Bulletin Board on Weetoo, where you can share and discover insights on technology, finance, and more. Connect with experts and enthusiasts in a vibrant community.",
};

export default function FreeBoard() {
  return (
    <div className="container flex flex-col gap-3 mx-auto py-6 pb-12 px-4">
      {/* Minimal, balanced header row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-5 bg-muted/30 border border-border">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-0.5">
            Free Board
          </h1>
          <p className="text-sm text-muted-foreground leading-snug max-w-lg">
            Share and discover insights on technology, finance, and more.
            Connect with experts and enthusiasts in a vibrant community.
          </p>
        </div>
        <Link
          href="/create-post?board=free"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 transition-colors text-base"
        >
          <PlusIcon size={18} />
          Create Post
        </Link>
      </div>
      <ShowcaseGrid board="free-board" />
      <LeaderboardTable board="free-board" />
    </div>
  );
}
