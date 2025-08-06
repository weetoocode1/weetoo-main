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
import { useTranslations } from "next-intl";
import { memo, useEffect, useMemo, useState } from "react";
import { KorCoinsRankingTable } from "./kor-coins-ranking-table";

type TimeFrame = "daily" | "weekly" | "monthly";

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

const OnlineIndicator = memo(({ isOnline }: { isOnline: boolean }) => {
  const t = useTranslations("rankings");

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          isOnline
            ? "bg-green-500 animate-pulse"
            : "bg-gray-400 dark:bg-gray-600"
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
        {isOnline ? t("online") : t("offline")}
      </span>
    </div>
  );
});
OnlineIndicator.displayName = "OnlineIndicator";

interface KorCoinsUser {
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
  const t = useTranslations("rankings");
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>("daily");
  const [users, setUsers] = useState<KorCoinsUser[]>([]);
  const [, setUseDummyData] = useState(false);

  const fetchLeaderboard = async () => {
    const supabase = createClient();
    let viewName = "";
    if (selectedTimeFrame === "daily") viewName = "daily_kor_coins_leaderboard";
    else if (selectedTimeFrame === "weekly")
      viewName = "weekly_kor_coins_leaderboard";
    else viewName = "monthly_kor_coins_leaderboard";

    const { data, error } = await supabase
      .from(viewName)
      .select("*")
      .order("kor_coins_gained", { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) {
      // Use dummy data if no real data or error
      const dummyUsers = getDummyKorCoinsUsers(selectedTimeFrame);
      setUsers(dummyUsers);
      setUseDummyData(true);
    } else {
      // Use real data - map the database view fields to our component fields
      const ranked = data.map((user, idx) => ({
        id: user.id,
        nickname: user.nickname,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        kor_coins: user.kor_coins_gained, // Use period-specific gains instead of total balance
        weekly_gain: user.kor_coins_gained, // Use period-specific gains
        period_gain: user.kor_coins_gained, // Use period-specific gains
        last_active: user.last_active,
        updated_at: user.updated_at,
        rank: idx + 1,
      }));
      setUsers(ranked);
      setUseDummyData(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTimeFrame]);

  // Real-time subscription for kor_coins changes
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to changes in users table (kor_coins column)
    const channel = supabase
      .channel("kor_coins_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "users",
          filter: "kor_coins=neq.0", // Only listen to changes where kor_coins is not 0
        },
        (payload) => {
          console.log("KOR coins change detected:", payload);
          // Refetch data when kor_coins changes
          fetchLeaderboard();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTimeFrame]); // Re-subscribe when timeFrame changes

  // Sort users by period-specific gains descending and assign rank ONCE
  const sortedUsers: KorCoinsUser[] = useMemo(() => {
    return users
      .slice()
      .sort(
        (a, b) =>
          (b.period_gain || b.weekly_gain || 0) -
          (a.period_gain || a.weekly_gain || 0)
      )
      .map((user, idx) => ({ ...user, rank: idx + 1 }));
  }, [users]);

  const topUsers: KorCoinsUser[] = [
    sortedUsers[1], // 2nd place (left)
    sortedUsers[0], // 1st place (center)
    sortedUsers[2], // 3rd place (right)
  ].filter(Boolean);

  return (
    <div className="space-y-5 select-none">
      {/* Time Frame Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="bg-muted/30 rounded-lg p-1 backdrop-blur-sm border border-border/50 ml-auto">
          {(["daily", "weekly", "monthly"] as TimeFrame[]).map((timeFrame) => (
            <button
              key={timeFrame}
              onClick={() => setSelectedTimeFrame(timeFrame)}
              className={cn(
                "px-3 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
                selectedTimeFrame === timeFrame
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Demo Notice */}
      {/* {useDummyData && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-600 text-sm font-medium">
            📊 Showing demo data - No real KOR coins data found in the database
          </p>
        </div>
      )} */}

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
                      {(
                        user.period_gain ||
                        user.weekly_gain ||
                        0
                      )?.toLocaleString() || 0}
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
                      {selectedTimeFrame === "daily"
                        ? t("dailyGain")
                        : selectedTimeFrame === "weekly"
                        ? t("weeklyGain")
                        : t("monthlyGain")}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +
                      {(
                        user.period_gain || user.weekly_gain
                      )?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {t("lastActive")}
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
        <KorCoinsRankingTable
          users={sortedUsers}
          selectedTimeFrame={selectedTimeFrame}
          onTimeFrameChange={setSelectedTimeFrame}
        />
      </div>
    </div>
  );
};

KorCoinsRanking.displayName = "KorCoinsRanking";

// Dummy data function for KOR coins
function getDummyKorCoinsUsers(timeFrame: TimeFrame): KorCoinsUser[] {
  const dummyUsers: KorCoinsUser[] = [
    {
      id: "1",
      nickname: "CryptoKing",
      first_name: "John",
      last_name: "Smith",
      avatar_url:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 2500 : timeFrame === "weekly" ? 18500 : 75000,
      weekly_gain:
        timeFrame === "daily" ? 500 : timeFrame === "weekly" ? 3500 : 12000,
      period_gain:
        timeFrame === "daily" ? 500 : timeFrame === "weekly" ? 3500 : 12000,
      last_active: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      nickname: "TradingPro",
      first_name: "Sarah",
      last_name: "Johnson",
      avatar_url:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 2100 : timeFrame === "weekly" ? 16200 : 68000,
      weekly_gain:
        timeFrame === "daily" ? 450 : timeFrame === "weekly" ? 3200 : 11000,
      period_gain:
        timeFrame === "daily" ? 450 : timeFrame === "weekly" ? 3200 : 11000,
      last_active: "2024-01-15T09:15:00Z",
      updated_at: "2024-01-15T09:15:00Z",
    },
    {
      id: "3",
      nickname: "CoinMaster",
      first_name: "Mike",
      last_name: "Davis",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 1800 : timeFrame === "weekly" ? 14500 : 62000,
      weekly_gain:
        timeFrame === "daily" ? 380 : timeFrame === "weekly" ? 2800 : 9500,
      period_gain:
        timeFrame === "daily" ? 380 : timeFrame === "weekly" ? 2800 : 9500,
      last_active: "2024-01-15T08:45:00Z",
      updated_at: "2024-01-15T08:45:00Z",
    },
    {
      id: "4",
      nickname: "InvestorElite",
      first_name: "Emma",
      last_name: "Wilson",
      avatar_url:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 1650 : timeFrame === "weekly" ? 12800 : 58000,
      weekly_gain:
        timeFrame === "daily" ? 320 : timeFrame === "weekly" ? 2400 : 8200,
      period_gain:
        timeFrame === "daily" ? 320 : timeFrame === "weekly" ? 2400 : 8200,
      last_active: "2024-01-15T07:30:00Z",
      updated_at: "2024-01-15T07:30:00Z",
    },
    {
      id: "5",
      nickname: "WealthBuilder",
      first_name: "David",
      last_name: "Brown",
      avatar_url:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 1400 : timeFrame === "weekly" ? 11200 : 52000,
      weekly_gain:
        timeFrame === "daily" ? 280 : timeFrame === "weekly" ? 2100 : 7200,
      period_gain:
        timeFrame === "daily" ? 280 : timeFrame === "weekly" ? 2100 : 7200,
      last_active: "2024-01-15T06:20:00Z",
      updated_at: "2024-01-15T06:20:00Z",
    },
    {
      id: "6",
      nickname: "ProfitSeeker",
      first_name: "Lisa",
      last_name: "Garcia",
      avatar_url:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 1200 : timeFrame === "weekly" ? 9800 : 48000,
      weekly_gain:
        timeFrame === "daily" ? 240 : timeFrame === "weekly" ? 1800 : 6500,
      period_gain:
        timeFrame === "daily" ? 240 : timeFrame === "weekly" ? 1800 : 6500,
      last_active: "2024-01-15T05:10:00Z",
      updated_at: "2024-01-15T05:10:00Z",
    },
    {
      id: "7",
      nickname: "MarketWizard",
      first_name: "Alex",
      last_name: "Martinez",
      avatar_url:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 1100 : timeFrame === "weekly" ? 8500 : 42000,
      weekly_gain:
        timeFrame === "daily" ? 220 : timeFrame === "weekly" ? 1600 : 5800,
      period_gain:
        timeFrame === "daily" ? 220 : timeFrame === "weekly" ? 1600 : 5800,
      last_active: "2024-01-15T04:45:00Z",
      updated_at: "2024-01-15T04:45:00Z",
    },
    {
      id: "8",
      nickname: "CoinCollector",
      first_name: "Rachel",
      last_name: "Taylor",
      avatar_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 950 : timeFrame === "weekly" ? 7200 : 38000,
      weekly_gain:
        timeFrame === "daily" ? 190 : timeFrame === "weekly" ? 1400 : 5200,
      period_gain:
        timeFrame === "daily" ? 190 : timeFrame === "weekly" ? 1400 : 5200,
      last_active: "2024-01-15T03:30:00Z",
      updated_at: "2024-01-15T03:30:00Z",
    },
    {
      id: "9",
      nickname: "TradingGuru",
      first_name: "Tom",
      last_name: "Anderson",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 850 : timeFrame === "weekly" ? 6500 : 35000,
      weekly_gain:
        timeFrame === "daily" ? 170 : timeFrame === "weekly" ? 1200 : 4800,
      period_gain:
        timeFrame === "daily" ? 170 : timeFrame === "weekly" ? 1200 : 4800,
      last_active: "2024-01-15T02:15:00Z",
      updated_at: "2024-01-15T02:15:00Z",
    },
    {
      id: "10",
      nickname: "CryptoQueen",
      first_name: "Sophie",
      last_name: "Clark",
      avatar_url:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      kor_coins:
        timeFrame === "daily" ? 750 : timeFrame === "weekly" ? 5800 : 32000,
      weekly_gain:
        timeFrame === "daily" ? 150 : timeFrame === "weekly" ? 1100 : 4200,
      period_gain:
        timeFrame === "daily" ? 150 : timeFrame === "weekly" ? 1100 : 4200,
      last_active: "2024-01-15T01:00:00Z",
      updated_at: "2024-01-15T01:00:00Z",
    },
  ];

  return dummyUsers;
}
