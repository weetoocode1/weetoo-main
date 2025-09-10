"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { PlusIcon, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

import { LeaderboardTable } from "@/components/board/leaderboard-table";
import { ShowcaseGrid } from "@/components/board/showcase-grid";

export function FreeBoardPageClient() {
  const t = useTranslations("communityBoards");
  const { user } = useAuth();

  const handleCreatePostClick = (e: React.MouseEvent) => {
    if (!user?.identity_verified) {
      e.preventDefault();
      toast.error("Identity verification required to create posts.");
      return;
    }
  };

  return (
    <div className="container flex flex-col gap-3 mx-auto py-6 pb-12 px-4 pt-20">
      {/* Minimal, balanced header row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-5 bg-muted/30 border border-border">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-0.5">
            {t("freeBoard")}
          </h1>
        </div>
        <div className="relative">
          <Link
            href="/create-post?board=free"
            onClick={handleCreatePostClick}
            className={`inline-flex items-center gap-2 px-4 py-2 font-semibold shadow-sm transition-colors text-base ${
              user?.identity_verified
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
            }`}
          >
            <PlusIcon size={18} />
            {t("createPost")}
          </Link>
          {!user?.identity_verified && (
            <div className="absolute -top-2 -right-2">
              <div className="relative group">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  Verification required
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ShowcaseGrid board="free-board" />
      <LeaderboardTable board="free-board" />
    </div>
  );
}
