"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Award,
  DollarSign,
  Medal,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { memo, useMemo } from "react";

type TimeFrame = "daily" | "weekly" | "monthly";

interface TraderData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  level: number;
  total_pnl: number;
  virtual_balance: number;
  total_return: number;
  total_trades: number;
  winning_trades: number;
  closed_trades: number;
  win_rate: number;
  portfolio_value: number;
  isOnline: boolean;
}

// Dummy data for fallback
const getDummyTraders = (timeFrame: TimeFrame): TraderData[] => {
  const baseData = [
    {
      id: "1",
      nickname: "Alexander Chen",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      level: 25,
      total_pnl: 2847300,
      virtual_balance: 1000000,
      total_return: 247.8,
      total_trades: 542,
      winning_trades: 510,
      closed_trades: 542,
      win_rate: 94.2,
      portfolio_value: 3847300,
      isOnline: true,
    },
    {
      id: "2",
      nickname: "Sarah Kim",
      avatar_url:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      level: 18,
      total_pnl: 986200,
      virtual_balance: 1000000,
      total_return: 98.6,
      total_trades: 287,
      winning_trades: 227,
      closed_trades: 287,
      win_rate: 79.1,
      portfolio_value: 1986200,
      isOnline: false,
    },
    {
      id: "3",
      nickname: "Michael Chen",
      avatar_url:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      level: 15,
      total_pnl: 763400,
      virtual_balance: 1000000,
      total_return: 76.3,
      total_trades: 198,
      winning_trades: 154,
      closed_trades: 198,
      win_rate: 77.8,
      portfolio_value: 1763400,
      isOnline: true,
    },
  ];

  // Adjust values based on time frame
  const multiplier =
    timeFrame === "daily" ? 0.1 : timeFrame === "weekly" ? 0.3 : 1;

  return baseData.map((trader, index) => ({
    ...trader,
    total_pnl: Math.round(trader.total_pnl * multiplier),
    total_return: Math.round(trader.total_return * multiplier * 10) / 10,
    total_trades: Math.round(trader.total_trades * multiplier),
    winning_trades: Math.round(trader.winning_trades * multiplier),
    closed_trades: Math.round(trader.closed_trades * multiplier),
    win_rate: Math.round(trader.win_rate * (0.8 + Math.random() * 0.4)),
    portfolio_value: Math.round(trader.portfolio_value * multiplier),
    rank: index + 1,
  }));
};

// const rankIcons = {
//   1: Trophy,
//   2: Medal,
//   3: Award,
// };

const rankStyles = {
  1: {
    gradient: "from-yellow-400 via-yellow-500 to-yellow-600",
    border: "border-yellow-500/40",
    shadow: "shadow-[0_0_40px_rgba(234,179,8,0.25)]",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    icon: "text-yellow-400",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]",
  },
  2: {
    gradient: "from-slate-300 via-slate-400 to-slate-500",
    border: "border-slate-400/40",
    shadow: "shadow-[0_0_35px_rgba(148,163,184,0.2)]",
    badge: "bg-slate-500/20 text-slate-300 border-slate-400/40",
    icon: "text-slate-400",
    glow: "shadow-[0_0_15px_rgba(148,163,184,0.25)]",
  },
  3: {
    gradient: "from-amber-600 via-amber-700 to-amber-800",
    border: "border-amber-600/40",
    shadow: "shadow-[0_0_35px_rgba(217,119,6,0.2)]",
    badge: "bg-amber-600/20 text-amber-300 border-amber-600/40",
    icon: "text-amber-500",
    glow: "shadow-[0_0_15px_rgba(217,119,6,0.25)]",
  },
};

export const TraderRankingTable = memo(
  ({
    traders,
    selectedTimeFrame,
    onTimeFrameChange,
  }: {
    traders: TraderData[];
    selectedTimeFrame: TimeFrame;
    onTimeFrameChange: (timeFrame: TimeFrame) => void;
  }) => {
    // const t = useTranslations("traderRanking");

    // Fill remaining slots with demo data if we have fewer than 3 real traders
    const filledTraders = useMemo(() => {
      const top3Traders = traders.slice(0, 3);
      const demoTraders = getDummyTraders(selectedTimeFrame);

      const filled = [...top3Traders];
      while (filled.length < 3) {
        const demoIndex = filled.length;
        const demoTrader = demoTraders[demoIndex];
        if (demoTrader) {
          filled.push({
            ...demoTrader,
            id: `demo-${demoIndex + 1}`,
          });
        }
      }

      return filled;
    }, [traders, selectedTimeFrame]);

    // Add ranks to traders
    const rankedTraders = filledTraders.map((trader, index) => ({
      ...trader,
      rank: index + 1,
    }));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">
              Full Leaderboard
            </h2>
            <p className="text-muted-foreground">
              Complete ranking of all active traders •{" "}
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
                    "px-3 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
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
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 border-b border-border/50 font-semibold text-sm text-muted-foreground">
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">Trader</div>
            <div className="col-span-2">Total Return</div>
            <div className="col-span-2">Win Rate</div>
            <div className="col-span-2">Trades</div>
            <div className="col-span-2">Portfolio</div>
          </div>

          {/* Desktop Table Rows */}
          <div className="hidden md:block divide-y divide-border/50">
            {rankedTraders.map((trader) => {
              const isTop3 = trader.rank <= 3;
              const isDemo = trader.id.startsWith("demo-");
              const rankStyle = isTop3
                ? rankStyles[trader.rank as keyof typeof rankStyles]
                : null;

              return (
                <div
                  key={`${trader.id}-${trader.rank}`}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-6 py-5 hover:bg-muted/20 transition-all duration-300 group relative",
                    isTop3 &&
                      "bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20",
                    isDemo && "opacity-80"
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
                        {trader.rank === 1 ? (
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        ) : trader.rank === 2 ? (
                          <Medal className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Award className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-sm font-bold text-foreground">
                        {trader.rank}
                      </div>
                    )}
                  </div>

                  {/* Trader */}
                  <div className="col-span-3 flex items-center gap-4">
                    <Avatar
                      className={cn(
                        "ring-2 ring-border/30",
                        isTop3 ? "w-12 h-12" : "w-10 h-10"
                      )}
                    >
                      <AvatarImage
                        src={trader.avatar_url || undefined}
                        alt={trader.nickname}
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
                        {trader.nickname?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={cn(
                          "font-semibold text-foreground",
                          isTop3 ? "text-base" : "text-sm"
                        )}
                      >
                        {trader.nickname}
                      </div>
                      {isTop3 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Top Performer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Return */}
                  <div className="col-span-2 flex items-center">
                    <div
                      className={cn(
                        "font-semibold text-emerald-600 dark:text-emerald-400",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      +{trader.total_return.toFixed(2)}%
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span
                      className={cn(
                        "font-medium",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      {trader.win_rate.toFixed(2)}%
                    </span>
                  </div>

                  {/* Trades */}
                  <div className="col-span-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <span
                      className={cn(
                        "font-medium",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      {trader.total_trades}
                    </span>
                  </div>

                  {/* Portfolio */}
                  <div className="col-span-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span
                      className={cn(
                        "font-semibold text-foreground",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      $
                      {new Intl.NumberFormat("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(trader.portfolio_value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Table Rows */}
          <div className="md:hidden divide-y divide-border/50">
            {rankedTraders.map((trader) => {
              const isTop3 = trader.rank <= 3;
              const isDemo = trader.id.startsWith("demo-");
              const rankStyle = isTop3
                ? rankStyles[trader.rank as keyof typeof rankStyles]
                : null;

              return (
                <div
                  key={`${trader.id}-${trader.rank}`}
                  className={cn(
                    "p-4 hover:bg-muted/20 transition-all duration-300 group relative",
                    isTop3 &&
                      "bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20",
                    isDemo && "opacity-80"
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

                  <div className="relative z-10">
                    {/* Header with Rank and Trader */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Rank */}
                      <div className="flex items-center">
                        {isTop3 ? (
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shadow-lg",
                              rankStyle?.border,
                              rankStyle?.badge
                            )}
                          >
                            {trader.rank === 1 ? (
                              <Trophy className="w-4 h-4 text-yellow-500" />
                            ) : trader.rank === 2 ? (
                              <Medal className="w-4 h-4 text-slate-400" />
                            ) : (
                              <Award className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-xs font-bold text-foreground">
                            {trader.rank}
                          </div>
                        )}
                      </div>

                      {/* Trader */}
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar
                          className={cn(
                            "ring-2 ring-border/30",
                            isTop3 ? "w-10 h-10" : "w-8 h-8"
                          )}
                        >
                          <AvatarImage
                            src={trader.avatar_url || undefined}
                            alt={trader.nickname}
                          />
                          <AvatarFallback
                            className={cn(
                              "font-semibold",
                              isTop3 ? "text-sm" : "text-xs",
                              isTop3
                                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                                : "bg-muted/60"
                            )}
                          >
                            {trader.nickname?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div
                            className={cn(
                              "font-semibold text-foreground",
                              isTop3 ? "text-sm" : "text-xs"
                            )}
                          >
                            {trader.nickname}
                          </div>
                          {isTop3 && (
                            <div className="text-xs text-muted-foreground">
                              Top Performer
                            </div>
                          )}
                          {isDemo && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                              Demo
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Return */}
                      <div className="text-right">
                        <div
                          className={cn(
                            "font-semibold text-emerald-600 dark:text-emerald-400",
                            isTop3 ? "text-base" : "text-sm"
                          )}
                        >
                          +{trader.total_return.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="w-3 h-3 text-blue-500" />
                        <span className="text-muted-foreground">Win Rate:</span>
                        <span className="font-medium">
                          {trader.win_rate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-purple-500" />
                        <span className="text-muted-foreground">Trades:</span>
                        <span className="font-medium">
                          {trader.total_trades}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-gray-500" />
                        <span className="text-muted-foreground">
                          Portfolio:
                        </span>
                        <span className="font-medium">
                          $
                          {new Intl.NumberFormat("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(trader.portfolio_value)}
                        </span>
                      </div>
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

TraderRankingTable.displayName = "TraderRankingTable";
