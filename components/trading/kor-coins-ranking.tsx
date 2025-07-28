"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Award,
  Clock,
  Coins,
  Crown,
  Medal,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { KorCoinsRankingTable } from "./kor-coins-ranking-table";

// Memoized components
const RankBadge = memo(({ rank }: { rank: number }) => {
  const getBadgeConfig = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: Trophy,
          className:
            "border-2 border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-transparent font-bold px-3 py-1.5",
          iconColor: "text-yellow-600 dark:text-yellow-400",
        };
      case 2:
        return {
          icon: Medal,
          className:
            "border-2 border-slate-400 text-slate-600 dark:text-slate-400 bg-transparent font-bold px-3 py-1.5",
          iconColor: "text-slate-600 dark:text-slate-400",
        };
      case 3:
        return {
          icon: Award,
          className:
            "border-2 border-orange-500 text-orange-600 dark:text-orange-400 bg-transparent font-bold px-3 py-1.5",
          iconColor: "text-orange-600 dark:text-orange-400",
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig(rank);

  if (!config) {
    return (
      <div className="w-12 text-center">
        <span className="font-semibold text-muted-foreground">#{rank}</span>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <Badge className={`font-bold px-3 py-1.5 ${config.className}`}>
      <Icon className={`w-3.5 h-3.5 mr-1.5 ${config.iconColor}`} />#{rank}
    </Badge>
  );
});
RankBadge.displayName = "RankBadge";

const OnlineIndicator = memo(({ isOnline }: { isOnline: boolean }) => (
  <div className="flex items-center gap-1.5">
    <div
      className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400 dark:bg-gray-600"
      )}
    />
    <span
      className={cn(
        "text-xs",
        isOnline
          ? "text-green-600 dark:text-green-400"
          : "text-muted-foreground"
      )}
    >
      {isOnline ? "Online" : "Offline"}
    </span>
  </div>
));
OnlineIndicator.displayName = "OnlineIndicator";

interface KorCoinsUser {
  id: string;
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  kor_coins: number;
  weekly_gain: number;
  last_active: string | null;
  updated_at: string | null;
  rank?: number;
}

function getMainName(user: KorCoinsUser) {
  if (
    (user.first_name && user.first_name.trim() !== "") ||
    (user.last_name && user.last_name.trim() !== "")
  ) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return "Unknown";
}

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

function useTopKorCoinsUsers(limit = 30) {
  const [users, setUsers] = useState<KorCoinsUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);
    supabase
      .rpc("get_kor_coins_leaderboard", { limit_param: limit })
      .then(({ data, error }) => {
        if (error) {
          setUsers([]);
        } else {
          setUsers((data as KorCoinsUser[]) || []);
        }
        setLoading(false);
      });
  }, [limit]);

  return { users, loading };
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

export const KorCoinsRanking = () => {
  const { users, loading } = useTopKorCoinsUsers(30);

  // Sort users by kor_coins descending and assign rank ONCE
  const sortedUsers: KorCoinsUser[] = useMemo(() => {
    return users
      .slice()
      .sort((a, b) => (b.kor_coins || 0) - (a.kor_coins || 0))
      .map((user, idx) => ({ ...user, rank: idx + 1 }));
  }, [users]);

  const topUsers: KorCoinsUser[] = [
    sortedUsers[1], // 2nd place (left)
    sortedUsers[0], // 1st place (center)
    sortedUsers[2], // 3rd place (right)
  ].filter(Boolean);

  if (loading) {
    return <div className="text-center py-12">Loading leaderboard...</div>;
  }

  return (
    <div className="space-y-5 select-none">
      {/* Top 3 Leaderboard */}
      <div className="relative min-h-[350px] flex items-center justify-center gap-12 px-8">
        <div className="flex flex-col md:flex-row gap-6 w-full">
          {topUsers.map((user) => (
            <div
              key={user.id}
              className={cn(
                "flex-1 rounded-xl border p-6 shadow-lg transition-all duration-200 hover:shadow-xl relative overflow-hidden",
                user.rank === 1
                  ? "bg-gradient-to-br from-yellow-50/80 to-yellow-100/50 dark:from-yellow-950/40 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  : user.rank === 2
                  ? "bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/20 border-slate-200 dark:border-slate-800"
                  : "bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20 border-orange-200 dark:border-orange-800"
              )}
            >
              {/* Decorative background pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <Coins className="w-full h-full" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <RankBadge rank={user.rank!} />
                  <div className="flex items-center gap-2">
                    <Coins
                      className={cn(
                        "w-5 h-5",
                        user.rank === 1
                          ? "text-yellow-500"
                          : user.rank === 2
                          ? "text-slate-400"
                          : "text-orange-500"
                      )}
                    />
                    <span
                      className={cn(
                        "font-bold text-lg",
                        user.rank === 1
                          ? "text-yellow-600 dark:text-yellow-400"
                          : user.rank === 2
                          ? "text-slate-600 dark:text-slate-400"
                          : "text-orange-600 dark:text-orange-400"
                      )}
                    >
                      {user.kor_coins?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-2 ring-border">
                      <AvatarImage
                        src={user.avatar_url || ""}
                        alt={getMainName(user)}
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xl font-medium">
                        {getMainName(user).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {getNickname(user)}
                      {user.rank === 1 && (
                        <Crown className="w-5 h-5 text-yellow-500" />
                      )}
                    </h3>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Weekly Gain
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{user.weekly_gain?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last Active
                    </span>
                    <span className="text-sm">
                      {formatRelativeTime(user.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Full Leaderboard Table Section */}
      <div className="">
        <KorCoinsRankingTable users={sortedUsers} />
      </div>
    </div>
  );
};

KorCoinsRanking.displayName = "KorCoinsRanking";
