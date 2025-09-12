"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ProfitRankingTable } from "./profit-ranking-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/post/follow-button";
import { useAuth } from "@/hooks/use-auth";
import { Award, DollarSign, TrendingUp, UserPlus, Star } from "lucide-react";
import { motion } from "motion/react";

type TimeFrame = "daily" | "weekly" | "monthly";

interface ProfitTraderData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  level: number;
  total_pnl: number;
  virtual_balance: number;
  total_return: number; // profit rate %
  total_trades: number;
  portfolio_value: number;
}

interface CardData {
  id: string;
  rank: number;
  name: string;
  username: string;
  avatar_url?: string | null;
  totalReturn: number;
  portfolio: number;
  trades: number;
  position: "left" | "center" | "right";
  color: "gold" | "silver" | "bronze";
}

const RankingFollowButton = ({
  targetUserId,
  rank,
  className,
  isDemoData = false,
}: {
  targetUserId: string;
  rank: number;
  className?: string;
  isDemoData?: boolean;
}) => {
  const { user: currentUser, loading: authLoading } = useAuth();
  if (authLoading)
    return <Skeleton className={cn("h-9 w-16 rounded-md", className)} />;
  if (isDemoData)
    return (
      <Button className="w-full cursor-not-allowed" disabled variant="outline">
        <UserPlus className="w-4 h-4 mr-2" /> Follow
      </Button>
    );
  if (currentUser && currentUser.id === targetUserId)
    return (
      <Button className="w-full cursor-not-allowed" disabled variant="outline">
        <UserPlus className="w-4 h-4 mr-2" /> Follow
      </Button>
    );
  return (
    <FollowButton
      targetUserId={targetUserId}
      className={cn("w-full", className)}
    />
  );
};

// ===== Profit Card (desktop) - cloned from TraderCard design with profit stats =====
const ProfitCard = memo(
  ({
    data,
    useDummyData,
    shouldAnimate = true,
  }: {
    data: CardData;
    useDummyData: boolean;
    shouldAnimate?: boolean;
  }) => {
    // Card visual styles copied from TraderCard
    const cardStyles = useMemo(() => {
      const baseStyles = { boxShadow: "", backgroundImage: "", border: "none" };
      switch (data.rank) {
        case 1:
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 2px #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.15)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(252, 211, 77, 0.08), transparent 40%)",
          };
        case 2:
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 1.5px #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(203, 213, 225, 0.05), transparent 40%)",
          };
        case 3:
          return {
            ...baseStyles,
            boxShadow:
              "0 0 0 1.5px #f97316, 0 0 10px 2px rgba(217, 119, 6, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(253, 186, 116, 0.05), transparent 40%)",
          };
        default:
          return baseStyles;
      }
    }, [data.rank]);

    const reflectionStyles = useMemo<{
      transform?: string;
      borderRadius: string;
      clipPath: string;
      opacity: number;
      boxShadow?: string;
      backgroundImage?: string;
      top: string;
      width: string;
      height: string;
    }>(() => {
      const base = {
        transform: "scaleY(-1)",
        borderRadius: "0 0 16px 16px",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        opacity: 0.45,
        top: "510px",
        width: "20rem",
        height: "150px",
      } as const;
      switch (data.rank) {
        case 1:
          return {
            ...base,
            boxShadow:
              "2px 0 0 0 #f59e0b, -2px 0 0 0 #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.3)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(252, 211, 77, 0.05), transparent 30%)",
            top: "540px",
            width: "24rem",
            height: "180px",
          };
        case 2:
          return {
            ...base,
            transform: "scaleY(-1) rotateY(12deg)",
            boxShadow:
              "1.5px 0 0 0 #cbd5e1, -1.5px 0 0 0 #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(203, 213, 225, 0.03), transparent 30%)",
          };
        case 3:
          return {
            ...base,
            transform: "scaleY(-1) rotateY(-12deg)",
            boxShadow:
              "1.5px 0 0 0 #f97316, -1.5px 0 0 0 #f97316, 0 0 10px 2px rgba(217, 119, 6, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(253, 186, 116, 0.03), transparent 30%)",
          };
        default:
          return base;
      }
    }, [data.rank]);

    const cardSize = data.rank === 1 ? "w-96 h-[520px]" : "w-80 h-[490px]";
    const padding = data.rank === 1 ? "p-7" : "p-6";
    const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

    return (
      <motion.div
        className="relative group"
        custom={data.rank}
        variants={{
          hidden: { opacity: 0, scale: 0.8, y: 100 },
          visible: (custom: number) => ({
            opacity: 1,
            scale: custom === 1 ? 1 : custom === 2 ? 0.9 : 0.85,
            y: custom === 1 ? -20 : custom === 2 ? 38 : 50,
            rotateY: custom === 2 ? 12 : custom === 3 ? -12 : 0,
            z: custom === 1 ? 0 : custom === 2 ? -80 : -120,
            transition: {
              duration: 0.5,
              delay: custom === 1 ? 0.1 : custom === 2 ? 0.4 : 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            },
          }),
        }}
        initial={shouldAnimate ? "hidden" : "visible"}
        animate="visible"
        style={{
          transform: `rotateY(${
            data.rank === 2 ? "12deg" : data.rank === 3 ? "-12deg" : "0deg"
          }) translateZ(${
            data.rank === 1 ? "0px" : data.rank === 2 ? "-80px" : "-120px"
          }) translateY(${
            data.rank === 1 ? "-20px" : data.rank === 2 ? "38px" : "50px"
          }) scale(${
            data.rank === 1 ? "1" : data.rank === 2 ? "0.9" : "0.85"
          })`,
        }}
      >
        <div
          className={`${cardSize} rounded-2xl shadow-lg overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`}
          style={cardStyles}
        >
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
          <div className="absolute inset-0 opacity-15 bg-gradient-to-tl from-white/10 via-transparent to-white/5" />
          <div className={`relative z-10 h-full ${padding} flex flex-col`}>
            <div className="flex justify-end mb-6">
              <Badge
                className={
                  data.rank === 1
                    ? "bg-yellow-400/20 text-yellow-800 dark:text-yellow-200 border border-yellow-400/60 px-4 py-2.5 text-base font-bold shadow-lg"
                    : data.rank === 2
                    ? "bg-slate-200/10 text-slate-700 dark:text-slate-200 border border-slate-400/50 px-3.5 py-2 text-sm font-semibold shadow-md"
                    : "bg-amber-700/20 text-amber-800 dark:text-amber-300 border border-amber-500/50 px-3.5 py-2 text-sm font-semibold shadow-md"
                }
              >
                {data.rank === 1 ? (
                  <Award className="w-5 h-5 mr-2" />
                ) : data.rank === 2 ? (
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                )}
                #{data.rank}
              </Badge>
            </div>

            <div
              className={`flex flex-col items-center ${
                data.rank === 1 ? "gap-4 mb-6" : "gap-3 mb-5"
              }`}
            >
              <Avatar
                className={`${
                  data.rank === 1 ? "w-16 h-16" : "w-14 h-14"
                } ring-2 ${
                  data.rank === 1
                    ? "ring-yellow-400/30"
                    : data.rank === 2
                    ? "ring-slate-400/20"
                    : "ring-amber-500/20"
                }`}
              >
                <AvatarImage src={data.avatar_url || ""} alt={data.name} />
                <AvatarFallback
                  className={
                    data.rank === 1
                      ? "bg-yellow-500/20 text-yellow-300 text-xl font-bold"
                      : data.rank === 2
                      ? "bg-slate-500/20 text-slate-300 font-semibold text-lg"
                      : "bg-amber-600/20 text-amber-300 font-semibold text-lg"
                  }
                >
                  {data.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3
                className={`${
                  data.rank === 1 ? "text-2xl" : "text-xl"
                } font-bold text-foreground text-center`}
              >
                {data.name}
              </h3>
            </div>

            {useDummyData ? (
              <RankingFollowButton
                targetUserId={data.id}
                rank={data.rank}
                className={`w-full ${data.rank === 1 ? "mb-6" : "mb-5"}`}
                isDemoData={true}
              />
            ) : (
              <RankingFollowButton
                targetUserId={data.id}
                rank={data.rank}
                className={`w-full ${data.rank === 1 ? "mb-6" : "mb-5"}`}
                isDemoData={false}
              />
            )}

            <div
              className={`${
                data.rank === 1 ? "space-y-4" : "space-y-3"
              } flex-1`}
            >
              <div
                className={`flex items-center justify-between ${
                  data.rank === 1 ? "py-3" : "py-2"
                } border-b border-border/30`}
              >
                <div
                  className={`flex items-center ${
                    data.rank === 1 ? "gap-2.5" : "gap-2"
                  } ${data.rank === 1 ? "" : "text-sm "}text-muted-foreground`}
                >
                  <DollarSign
                    className={`${
                      data.rank === 1 ? "w-4 h-4" : "w-3.5 h-3.5"
                    } text-emerald-400`}
                  />
                  <span className="font-medium">Profit Rate</span>
                </div>
                <span
                  className={`${
                    data.rank === 1 ? "text-xl" : "text-base"
                  } font-bold text-foreground`}
                >
                  {Number(data.totalReturn || 0).toFixed(2)}%
                </span>
              </div>

              <div
                className={`flex items-center justify-between ${
                  data.rank === 1 ? "py-2.5" : "py-2"
                } border-b border-border/30`}
              >
                <div
                  className={`flex items-center ${
                    data.rank === 1 ? "gap-2.5" : "gap-2"
                  } ${data.rank === 1 ? "" : "text-sm "}text-muted-foreground`}
                >
                  <DollarSign
                    className={`${
                      data.rank === 1 ? "w-4 h-4" : "w-3.5 h-3.5"
                    } text-amber-400`}
                  />
                  <span className="font-medium">Portfolio</span>
                </div>
                <span
                  className={`${
                    data.rank === 1 ? "text-xl" : "text-base"
                  } font-bold text-foreground`}
                >
                  {numberFormatter.format(Number(data.portfolio || 0))}
                </span>
              </div>

              <div
                className={`flex items-center justify-between ${
                  data.rank === 1 ? "py-2.5" : "py-2"
                } border-b border-border/30`}
              >
                <div
                  className={`flex items-center ${
                    data.rank === 1 ? "gap-2.5" : "gap-2"
                  } ${data.rank === 1 ? "" : "text-sm "}text-muted-foreground`}
                >
                  <TrendingUp
                    className={`${
                      data.rank === 1 ? "w-4 h-4" : "w-3.5 h-3.5"
                    } text-purple-400`}
                  />
                  <span className="font-medium">Trades</span>
                </div>
                <span
                  className={`${
                    data.rank === 1 ? "text-xl" : "text-base"
                  } font-bold text-foreground`}
                >
                  {Number(data.trades || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reflection */}
        <div
          className="absolute left-0 overflow-hidden"
          style={{
            top: reflectionStyles.top,
            width: reflectionStyles.width,
            height: reflectionStyles.height,
            transform: reflectionStyles.transform,
            borderRadius: "0 0 16px 16px",
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            boxShadow: reflectionStyles.boxShadow,
            opacity: 0.45,
            backgroundImage: reflectionStyles.backgroundImage,
            filter: "blur(2px)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, hsl(var(--background) / 0.35) 0%, hsl(var(--background) / 0.2) 25%, transparent 65%)",
            }}
          />
        </div>
      </motion.div>
    );
  }
);
ProfitCard.displayName = "ProfitCard";

// ===== Mobile Profit Card =====
const MobileProfitCard = memo(({ data }: { data: CardData }) => {
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  return (
    <div className="relative rounded-lg border border-border p-4 sm:p-5 shadow-sm bg-background/80">
      <div className="flex justify-end mb-4">
        <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center text-sm font-bold shadow-md">
          #{data.rank}
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 mb-4">
        <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-border/30">
          <AvatarImage src={data.avatar_url || undefined} alt={data.name} />
          <AvatarFallback className="font-semibold text-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            {data.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {data.name}
          </h3>
        </div>
      </div>
      <div className="mt-2 pt-3 border-t border-border/30 space-y-2">
        <div className="flex items-center justify-between py-2 border-b border-border/20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-medium">Profit Rate</span>
          </div>
          <span className="font-semibold text-foreground text-sm sm:text-base whitespace-nowrap">
            {Number(data.totalReturn || 0).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border/20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span className="text-xs sm:text-sm font-medium">Portfolio</span>
          </div>
          <span className="font-semibold text-foreground text-sm sm:text-base whitespace-nowrap">
            {numberFormatter.format(Number(data.portfolio || 0))}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs sm:text-sm font-medium">Trades</span>
          </div>
          <span className="font-semibold text-foreground text-sm sm:text-base whitespace-nowrap">
            {Number(data.trades || 0)}
          </span>
        </div>
      </div>
    </div>
  );
});
MobileProfitCard.displayName = "MobileProfitCard";

export const ProfitRanking = memo(() => {
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>("daily");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    data: traders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profit-leaderboard", selectedTimeFrame],
    queryFn: async () => {
      const supabase = createClient();
      const viewName =
        selectedTimeFrame === "daily"
          ? "daily_profit_leaderboard"
          : selectedTimeFrame === "weekly"
          ? "weekly_profit_leaderboard"
          : "monthly_profit_leaderboard";
      const { data, error } = await supabase
        .from(viewName)
        .select("*")
        .limit(10);
      if (error) throw error;
      return (data || []) as ProfitTraderData[];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const useDummyData = traders.length < 10 || !!error;
  useEffect(() => {
    if (!isLoading) setIsInitialLoad(false);
  }, [isLoading]);

  const displayTraders = (traders as ProfitTraderData[]) || [];
  //   const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const cardData = useMemo(() => {
    const top3 = displayTraders.slice(0, 3);
    const demoNames = [
      "Alex Morgan",
      "Priya Sharma",
      "Mateo Alvarez",
      "Liam Park",
      "Ava Chen",
      "Noah Kim",
    ];
    const timeFrameOffset =
      selectedTimeFrame === "daily"
        ? 0
        : selectedTimeFrame === "weekly"
        ? 2
        : 4;
    while (top3.length < 3) {
      const idx = (top3.length + timeFrameOffset) % demoNames.length;
      top3.push({
        id: `demo-${top3.length + 1}`,
        nickname: demoNames[idx],
        avatar_url: null,
        level: 0,
        total_pnl: 0,
        virtual_balance: 1000000,
        total_return: 0,
        total_trades: 0,
        portfolio_value: 1000000,
      });
    }
    return top3.map((trader, index) => ({
      id: trader.id,
      rank: index + 1,
      name: trader.nickname,
      username: `@${trader.nickname.toLowerCase().replace(/\s+/g, "")}`,
      avatar_url: trader.avatar_url,
      totalReturn: trader.total_return,
      portfolio: trader.portfolio_value,
      trades: trader.total_trades,
      position: index === 0 ? "center" : index === 1 ? "left" : "right",
      color: index === 0 ? "gold" : index === 1 ? "silver" : "bronze",
    }));
  }, [displayTraders, selectedTimeFrame]);

  return (
    <div className="space-y-16 mb-20">
      {/* Time Frame Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 mt-8 gap-4 pb-2 sm:pb-0">
        <div className="w-full overflow-x-auto scrollbar-none self-end">
          <div className="w-full flex justify-end">
            <div className="bg-muted/30 rounded-lg p-1 backdrop-blur-sm border border-border/50 inline-flex">
              {(["daily", "weekly", "monthly"] as TimeFrame[]).map(
                (timeFrame) => (
                  <button
                    key={timeFrame}
                    onClick={() => setSelectedTimeFrame(timeFrame)}
                    className={cn(
                      "px-3 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200",
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
        </div>
      </div>

      {/* Desktop Layout - Olympic Podium (same as TraderRanking) */}
      <div
        className="relative min-h-[700px] hidden lg:flex items-center justify-center gap-12 px-8"
        style={{ perspective: "1200px" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-12">
            {[1, 2, 3].map((rank) => (
              <div
                key={rank}
                className={`w-80 h-[490px] rounded-2xl bg-muted/20 animate-pulse`}
              />
            ))}
          </div>
        ) : (
          cardData.length >= 3 &&
          (() => {
            const podiumOrder = [1, 0, 2];
            return podiumOrder.map((idx) => {
              const card = cardData[idx];
              if (!card) return null;
              return (
                <ProfitCard
                  key={card.id}
                  data={card as CardData}
                  useDummyData={
                    useDummyData ||
                    card.id.startsWith("demo-") ||
                    !card.id.includes("-")
                  }
                  shouldAnimate={!isInitialLoad}
                />
              );
            });
          })()
        )}
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-4 -mt-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((rank) => (
              <div
                key={rank}
                className="h-32 rounded-xl bg-muted/20 animate-pulse"
              />
            ))}
          </div>
        ) : (
          cardData
            .slice(0, 3)
            .map((card) => (
              <MobileProfitCard
                key={`${card.id}-${card.rank}`}
                data={card as CardData}
              />
            ))
        )}
      </div>

      {/* Full Leaderboard Table Section */}
      <div className="mt-12">
        <ProfitRankingTable
          traders={traders as ProfitTraderData[]}
          selectedTimeFrame={selectedTimeFrame}
          onTimeFrameChange={setSelectedTimeFrame}
        />
      </div>
    </div>
  );
});

ProfitRanking.displayName = "ProfitRanking";
