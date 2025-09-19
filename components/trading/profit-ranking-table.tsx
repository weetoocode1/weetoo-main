"use client";

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Award, DollarSign, TrendingUp, Trophy, Medal } from "lucide-react";

type TimeFrame = "daily" | "weekly" | "monthly";

interface TraderData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_return: number; // profit rate
  total_trades: number;
  portfolio_value: number;
}

type TraderRow = TraderData & { rank: number };

// Simple demo data adapter to fill to 10
const getDummyTraders = (timeFrame: TimeFrame): TraderData[] => {
  const base: TraderData[] = [
    {
      id: "1",
      nickname: "Alexander Chen",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      total_return: 247.8,
      total_trades: 542,
      portfolio_value: 3847300,
    },
    {
      id: "2",
      nickname: "Sarah Kim",
      avatar_url:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      total_return: 98.6,
      total_trades: 287,
      portfolio_value: 1986200,
    },
    {
      id: "3",
      nickname: "Michael Chen",
      avatar_url:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      total_return: 76.3,
      total_trades: 198,
      portfolio_value: 1763400,
    },
  ];
  const multiplier =
    timeFrame === "daily" ? 0.1 : timeFrame === "weekly" ? 0.3 : 1;
  return base.map((t) => ({
    ...t,
    total_return: Math.round(t.total_return * multiplier * 10) / 10,
    total_trades: Math.round(t.total_trades * multiplier),
    portfolio_value: Math.round(t.portfolio_value * multiplier),
  }));
};

const rankStyles: Record<1 | 2 | 3, { border: string; badge: string }> = {
  1: {
    border: "border-yellow-500/40",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  },
  2: {
    border: "border-slate-400/40",
    badge: "bg-slate-500/20 text-slate-300 border-slate-400/40",
  },
  3: {
    border: "border-amber-600/40",
    badge: "bg-amber-600/20 text-amber-300 border-amber-600/40",
  },
};

export const ProfitRankingTable = memo(
  ({
    traders,
    selectedTimeFrame,
    onTimeFrameChange,
  }: {
    traders: TraderData[];
    selectedTimeFrame: TimeFrame;
    onTimeFrameChange: (t: TimeFrame) => void;
  }) => {
    const t = useTranslations("profitRanking");
    const filledTraders = useMemo<TraderRow[]>(() => {
      const nonZero = (traders || []).filter(
        (t) => (t.total_trades ?? 0) > 0 || (t.total_return ?? 0) > 0
      );
      const base = nonZero.length > 0 ? nonZero : traders || [];
      const top10 = base.slice(0, 10);
      const demo = getDummyTraders(selectedTimeFrame);
      const filled = [...top10];
      while (filled.length < 10) {
        const d = demo[filled.length % 3];
        filled.push({ ...d, id: `demo-${filled.length + 1}` });
      }
      return filled.map((t, i) => ({ ...t, rank: i + 1 }));
    }, [traders, selectedTimeFrame]);

    const numberFormatter = new Intl.NumberFormat("en-US");
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">
              {t("fullLeaderboard")}
            </h2>
            <p className="text-muted-foreground">
              {t("fullLeaderboardSubtitle", {
                timeframe: t(selectedTimeFrame),
              })}
            </p>
          </div>
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
                  {t(timeFrame)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="bg-background/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden shadow-xl">
          <div className="hidden md:grid grid-cols-10 gap-4 px-6 py-5 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 border-b border-border/50 font-semibold text-sm text-muted-foreground">
            <div className="col-span-1">{t("tableRank")}</div>
            <div className="col-span-3">{t("tableTrader")}</div>
            <div className="col-span-2">{t("tableProfitRate")}</div>
            <div className="col-span-2">{t("tablePortfolio")}</div>
            <div className="col-span-2">{t("tableTrades")}</div>
          </div>

          <div className="hidden md:block divide-y divide-border/50">
            {filledTraders.map((trader: TraderRow) => {
              const isTop3 = trader.rank <= 3;
              const isDemo = String(trader.id).startsWith("demo-");
              const rankStyle = isTop3
                ? rankStyles[trader.rank as 1 | 2 | 3]
                : undefined;
              return (
                <div
                  key={`${trader.id}-${trader.rank}`}
                  className={cn(
                    "grid grid-cols-10 gap-4 px-6 py-5 hover:bg-muted/20 transition-all duration-300 group relative",
                    isTop3 &&
                      "bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20",
                    isDemo && "opacity-80"
                  )}
                >
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
                        {trader.nickname || "Unknown Trader"}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span
                      className={cn(
                        "font-medium",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      {Number(trader.total_return || 0).toFixed(2)}%
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span
                      className={cn(
                        "font-medium",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      {numberFormatter.format(
                        Number(trader.portfolio_value || 0)
                      )}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <span
                      className={cn(
                        "font-medium",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      {Number(trader.total_trades || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-border/50">
            {filledTraders.map((trader: TraderRow) => (
              <div
                key={`${trader.id}-${trader.rank}`}
                className="p-4 hover:bg-muted/20 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-xs font-bold text-foreground">
                    {trader.rank}
                  </div>
                  <Avatar className="w-8 h-8 ring-2 ring-border/30">
                    <AvatarImage
                      src={trader.avatar_url || undefined}
                      alt={trader.nickname}
                    />
                    <AvatarFallback className="text-xs bg-muted/60 font-semibold">
                      {trader.nickname?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-semibold text-sm">
                    {trader.nickname || "Unknown Trader"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                    <span className="text-muted-foreground">Profit Rate:</span>
                    <span className="font-medium">
                      {Number(trader.total_return || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-amber-500" />
                    <span className="text-muted-foreground">Portfolio:</span>
                    <span className="font-medium">
                      {numberFormatter.format(
                        Number(trader.portfolio_value || 0)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-purple-500" />
                    <span className="text-muted-foreground">Trades:</span>
                    <span className="font-medium">
                      {Number(trader.total_trades || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ProfitRankingTable.displayName = "ProfitRankingTable";
