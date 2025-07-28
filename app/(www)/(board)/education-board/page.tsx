import { ShowcaseGrid } from "@/components/board/showcase-grid";
import { LeaderboardTable } from "@/components/board/leaderboard-table";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Education Board | Weetoo",
  description:
    "Explore the Education Board on Weetoo, where you can share and discover insights on education. Connect with experts and enthusiasts in a vibrant community.",
};

export default function EducationBoard() {
  return (
    <div className="container flex flex-col gap-3 mx-auto py-6 pb-12 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-5 bg-muted/30 border border-border">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-0.5">
            Education Board
          </h1>
          <p className="text-sm text-muted-foreground leading-snug max-w-lg">
            Share and discover insights on education. Connect with experts and
            enthusiasts in a vibrant community.
          </p>
        </div>
        <Link
          href="/create-post?board=education"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 transition-colors text-base"
        >
          <PlusIcon size={18} />
          Create Post
        </Link>
      </div>
      <ShowcaseGrid board="education-board" />
      <LeaderboardTable board="education-board" />
    </div>
  );
}
