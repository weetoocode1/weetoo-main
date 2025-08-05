"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Award, Medal, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";

export interface KorCoinsUser {
  id: string;
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  kor_coins: number;
  weekly_gain: number;
  period_gain?: number;
  last_active: string | null;
  updated_at: string | null;
  rank?: number;
}

type TimeFrame = "daily" | "weekly" | "monthly";

// function getMainName(user: KorCoinsUser) {
//   if (
//     (user.first_name && user.first_name.trim() !== "") ||
//     (user.last_name && user.last_name.trim() !== "")
//   ) {
//     return `${user.first_name || ""} ${user.last_name || ""}`.trim();
//   }
//   return "Unknown";
// }

function getNickname(user: KorCoinsUser) {
  if (
    !user.nickname ||
    user.nickname.trim() === "" ||
    user.nickname.toLowerCase() === "unknown" ||
    user.nickname === "-"
  ) {
    return "@unknown";
  }
  return `@${user.nickname}`;
}

// Utility to format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${
      Math.floor(diff / 3600) > 1 ? "s" : ""
    } ago`;
  if (diff < 2592000)
    return `${Math.floor(diff / 86400)} day${
      Math.floor(diff / 86400) > 1 ? "s" : ""
    } ago`;
  return date.toLocaleDateString();
}

export const KorCoinsRankingTable = memo(
  ({
    users,
    selectedTimeFrame,
    onTimeFrameChange,
  }: {
    users: KorCoinsUser[];
    selectedTimeFrame: TimeFrame;
    onTimeFrameChange: (timeFrame: TimeFrame) => void;
  }) => {
    const t = useTranslations("rankings");

    return (
      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-foreground">
              Full Leaderboard
            </h2>
            <p className="text-muted-foreground">
              Complete ranking of all active users •{" "}
              {selectedTimeFrame.charAt(0).toUpperCase() +
                selectedTimeFrame.slice(1)}{" "}
              Rankings
            </p>
          </div>

          {/* Time Frame Tabs */}
          <div className="bg-muted/30 rounded-lg p-1 backdrop-blur-sm border border-border/50">
            {(["daily", "weekly", "monthly"] as TimeFrame[]).map(
              (timeFrame) => (
                <button
                  key={timeFrame}
                  onClick={() => onTimeFrameChange(timeFrame)}
                  className={cn(
                    "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    selectedTimeFrame === timeFrame
                      ? "bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="bg-background/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden shadow-xl">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-5 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 border-b border-border/50 font-semibold text-sm text-muted-foreground">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">User</div>
            <div className="col-span-3">KOR Coins</div>
            <div className="col-span-2">
              {selectedTimeFrame === "daily"
                ? t("dailyGain")
                : selectedTimeFrame === "weekly"
                ? t("weeklyGain")
                : t("monthlyGain")}
            </div>
            <div className="col-span-2">Last Active</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border/50">
            {users.map((user, index) => {
              const isTop3 = (user.rank || 0) <= 3;
              const rankStyles = {
                1: {
                  border: "border-yellow-500/40",
                  badge:
                    "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
                  shadow: "shadow-[0_0_35px_rgba(234,179,8,0.2)]",
                },
                2: {
                  border: "border-slate-400/40",
                  badge: "bg-slate-500/20 text-slate-300 border-slate-400/40",
                  shadow: "shadow-[0_0_35px_rgba(148,163,184,0.2)]",
                },
                3: {
                  border: "border-amber-600/40",
                  badge: "bg-amber-600/20 text-amber-300 border-amber-600/40",
                  shadow: "shadow-[0_0_35px_rgba(217,119,6,0.2)]",
                },
              } as const;

              const rankStyle = isTop3
                ? rankStyles[user.rank as keyof typeof rankStyles]
                : null;

              return (
                <div
                  key={user.id}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-6 py-5 hover:bg-muted/20 transition-all duration-300 group relative",
                    isTop3 &&
                      "bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20"
                  )}
                >
                  {/* Background glow for top 3 */}
                  {isTop3 && (
                    <div
                      className={cn(
                        "absolute inset-0 opacity-20",
                        rankStyle?.shadow
                      )}
                    />
                  )}

                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    {isTop3 ? (
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 shadow-lg",
                          rankStyle?.border,
                          rankStyle?.badge
                        )}
                      >
                        {user.rank === 1 ? (
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        ) : user.rank === 2 ? (
                          <Medal className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Award className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-sm font-bold text-foreground">
                        {user.rank}
                      </div>
                    )}
                  </div>

                  {/* User */}
                  <div className="col-span-4 flex items-center gap-4">
                    <Avatar
                      className={cn(
                        "ring-2 ring-border/30",
                        isTop3 ? "w-12 h-12" : "w-10 h-10"
                      )}
                    >
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.nickname}
                      />
                      <AvatarFallback
                        className={cn(
                          "font-semibold",
                          isTop3 ? "text-base" : "text-sm",
                          isTop3
                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                            : "bg-muted/60"
                        )}
                      >
                        {user.nickname?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={cn(
                          "font-semibold text-foreground",
                          isTop3 ? "text-base" : "text-sm"
                        )}
                      >
                        {getNickname(user)}
                      </div>
                      {isTop3 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Top Performer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KOR Coins */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div
                      className={cn(
                        "font-semibold text-foreground",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      {(
                        user.period_gain ||
                        user.weekly_gain ||
                        0
                      )?.toLocaleString()}
                    </div>
                  </div>

                  {/* Period Gain */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <span className="text-xs font-medium">
                        +
                        {(
                          user.period_gain ||
                          user.weekly_gain ||
                          0
                        )?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Last Active */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-xs font-medium">
                        {formatRelativeTime(user.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

KorCoinsRankingTable.displayName = "KorCoinsRankingTable";
