"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  DollarSign,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { memo, useMemo, useState, useEffect } from "react";
import { TraderRankingTable } from "./trader-ranking-table";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FollowButton } from "@/components/post/follow-button";

// Type definition for user object
interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

// Custom FollowButton for rankings that handles own account
const RankingFollowButton = ({
  targetUserId,
  rank,
  className,
}: {
  targetUserId: string;
  rank: number;
  className?: string;
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    const checkCurrentUser = async () => {
      setIsCheckingStatus(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, first_name, last_name, nickname, avatar_url")
          .eq("id", user.id)
          .single();
        setCurrentUser(userData);
      }
      setIsCheckingStatus(false);
    };

    checkCurrentUser();
  }, []);

  if (isCheckingStatus) {
    return <Skeleton className={cn("h-9 w-16 rounded-md", className)} />;
  }

  // If it's the current user's own account, show a disabled button
  if (currentUser && currentUser.id === targetUserId) {
    return (
      <Button
        className={`w-full ${
          rank === 1
            ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-800 dark:text-yellow-100/60 border border-yellow-400/40 font-semibold h-11 text-base shadow-md cursor-not-allowed"
            : rank === 2
            ? "bg-slate-500/20 text-slate-700 dark:text-slate-100/60 border border-slate-400/30 font-semibold h-10 shadow-sm cursor-not-allowed"
            : "bg-amber-600/20 text-amber-800 dark:text-amber-200/60 border border-amber-500/30 font-semibold h-10 shadow-sm cursor-not-allowed"
        } transition-all duration-300`}
        disabled
        variant="outline"
      >
        <UserPlus className="w-4 h-4 mr-2" /> Follow
      </Button>
    );
  }

  // Otherwise, show the normal FollowButton
  return (
    <FollowButton
      targetUserId={targetUserId}
      className={`w-full ${
        rank === 1
          ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 hover:from-yellow-500/40 hover:to-yellow-600/40 text-yellow-800 dark:text-yellow-100 border border-yellow-400/60 font-semibold h-11 text-base shadow-md hover:shadow-lg"
          : rank === 2
          ? "bg-slate-500/30 hover:bg-slate-500/40 text-slate-700 dark:text-slate-100 border border-slate-400/50 font-semibold h-10 shadow-sm hover:shadow-md"
          : "bg-amber-600/30 hover:bg-amber-600/40 text-amber-800 dark:text-amber-200 border border-amber-500/50 font-semibold h-10 shadow-sm hover:shadow-md"
      } transition-all duration-300`}
    />
  );
};

// Define proper types
type CardColor = "gold" | "silver" | "bronze";
type CardPosition = "left" | "center" | "right";
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
  rank?: number;
}

interface ReflectionStyles {
  transform: string;
  borderRadius: string;
  clipPath: string;
  opacity: number;
  blur: string;
  boxShadow?: string;
  backgroundImage?: string;
  top?: string;
  width?: string;
  height?: string;
}

// Static data with proper typing
// const CARD_DATA: TraderData[] = [
//   {
//     id: "sarah-kim",
//     nickname: "Sarah Kim",
//     avatar_url: null,
//     level: 10,
//     total_pnl: 12345,
//     virtual_balance: 100000,
//     total_return: 98.6,
//     total_trades: 287,
//     winning_trades: 220,
//     closed_trades: 287,
//     win_rate: 79.1,
//     portfolio_value: 986200,
//     isOnline: false,
//     rank: 2,
//   },
//   {
//     id: "alexander-chen",
//     nickname: "Alexander Chen",
//     avatar_url: null,
//     level: 15,
//     total_pnl: 23456,
//     virtual_balance: 200000,
//     total_return: 247.8,
//     total_trades: 542,
//     winning_trades: 480,
//     closed_trades: 542,
//     win_rate: 94.2,
//     portfolio_value: 2847300,
//     isOnline: true,
//     rank: 1,
//   },
//   {
//     id: "michael-chen",
//     nickname: "Michael Chen",
//     avatar_url: null,
//     level: 8,
//     total_pnl: 7890,
//     virtual_balance: 50000,
//     total_return: 76.3,
//     total_trades: 198,
//     winning_trades: 150,
//     closed_trades: 198,
//     win_rate: 77.8,
//     portfolio_value: 763400,
//     isOnline: true,
//     rank: 3,
//   },
// ];

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

// Animation variants for better performance
const cardVariants = {
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
};

// const hoverVariants = {
//   hover: (custom: number) => ({
//     scale: custom === 1 ? 1.03 : custom === 2 ? 0.92 : 0.87,
//     y: custom === 1 ? -23 : custom === 2 ? 36 : 48,
//     rotateY: custom === 2 ? 10 : custom === 3 ? -10 : 0,
//     z: custom === 1 ? 5 : custom === 2 ? -75 : -115,
//     transition: { duration: 0.2, ease: "easeInOut" },
//   }),
// };

// OnlineIndicator copied from kor-coins-ranking
const OnlineIndicator = memo(({ isOnline }: { isOnline: boolean }) => {
  const t = useTranslations("traderRanking");
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div
        className={
          isOnline
            ? "w-2 h-2 rounded-full bg-green-500 animate-pulse"
            : "w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"
        }
      />
      <span
        className={
          isOnline
            ? "text-xs text-green-600 dark:text-green-400"
            : "text-xs text-muted-foreground"
        }
      >
        {isOnline ? t("online") : t("offline")}
      </span>
    </div>
  );
});
OnlineIndicator.displayName = "OnlineIndicator";

interface CardData {
  id: string;
  rank: number;
  name: string;
  username: string;
  avatar_url?: string | null;
  totalReturn: number;
  portfolio: number;
  winRate: number;
  trades: number;
  winStreak: number;
  position: CardPosition;
  color: CardColor;
  isOnline: boolean;
}

// Memoized card component
const TraderCard = memo(
  ({ data, useDummyData }: { data: CardData; useDummyData: boolean }) => {
    const t = useTranslations("traderRanking");
    const cardStyles = useMemo(() => {
      const baseStyles = {
        boxShadow: "",
        backgroundImage: "",
        border: "none",
      };

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

    const reflectionStyles = useMemo((): ReflectionStyles => {
      const baseReflection: ReflectionStyles = {
        transform: "scaleY(-1)",
        borderRadius: "0 0 16px 16px",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        opacity: 0.45,
        blur: "blur(2px)",
      };

      switch (data.rank) {
        case 1:
          return {
            ...baseReflection,
            boxShadow:
              "2px 0 0 0 #f59e0b, -2px 0 0 0 #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.3)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(252, 211, 77, 0.05), transparent 30%)",
            top: "540px",
            width: "96",
            height: "180px",
          };
        case 2:
          return {
            ...baseReflection,
            transform: "scaleY(-1) rotateY(12deg)",
            boxShadow:
              "1.5px 0 0 0 #cbd5e1, -1.5px 0 0 0 #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(203, 213, 225, 0.03), transparent 30%)",
            top: "510px",
            width: "80",
            height: "150px",
          };
        case 3:
          return {
            ...baseReflection,
            transform: "scaleY(-1) rotateY(-12deg)",
            boxShadow:
              "1.5px 0 0 0 #f97316, -1.5px 0 0 0 #f97316, 0 0 10px 2px rgba(217, 119, 6, 0.2)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(253, 186, 116, 0.03), transparent 30%)",
            top: "510px",
            width: "80",
            height: "150px",
          };
        default:
          return baseReflection;
      }
    }, [data.rank]);

    const cardSize = data.rank === 1 ? "w-96 h-[520px]" : "w-80 h-[490px]";
    const padding = data.rank === 1 ? "p-7" : "p-6";

    return (
      <motion.div
        className="relative group"
        custom={data.rank}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
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
            <div className="flex items-start justify-between mb-6">
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
              <div className="text-right">
                <div
                  className={`${
                    data.rank === 1
                      ? "text-emerald-600 dark:text-emerald-300 text-3xl"
                      : "text-emerald-600 dark:text-emerald-400 text-2xl"
                  } font-bold`}
                >
                  +{data.totalReturn.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {t("totalReturn")}
                </div>
              </div>
            </div>

            <div
              className={`flex items-center ${
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
                <AvatarImage
                  src={data.avatar_url || "/avatar.png"}
                  alt={data.name}
                />
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
              <div className="flex-1">
                <h3
                  className={`${
                    data.rank === 1 ? "text-2xl" : "text-xl"
                  } font-bold text-foreground`}
                >
                  {data.name}
                </h3>
              </div>
            </div>

            {useDummyData ? (
              <Button
                className={`w-full ${data.rank === 1 ? "mb-6" : "mb-5"} ${
                  data.rank === 1
                    ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 hover:from-yellow-500/40 hover:to-yellow-600/40 text-yellow-800 dark:text-yellow-100 border border-yellow-400/60 font-semibold h-11 text-base shadow-md hover:shadow-lg"
                    : data.rank === 2
                    ? "bg-slate-500/30 hover:bg-slate-500/40 text-slate-700 dark:text-slate-100 border border-slate-400/50 font-semibold h-10 shadow-sm hover:shadow-md"
                    : "bg-amber-600/30 hover:bg-amber-600/40 text-amber-800 dark:text-amber-200 border border-amber-500/50 font-semibold h-10 shadow-sm hover:shadow-md"
                } transition-all duration-300`}
                variant="outline"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Follow
              </Button>
            ) : (
              <RankingFollowButton
                targetUserId={data.id}
                rank={data.rank}
                className={`w-full ${data.rank === 1 ? "mb-6" : "mb-5"}`}
              />
            )}

            <div
              className={`${
                data.rank === 1 ? "space-y-4" : "space-y-3"
              } flex-1`}
            >
              <div
                className={`flex items-center justify-between mt-2 ${
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
                    } text-emerald-400`}
                  />
                  <span className="font-medium">{t("portfolio")}</span>
                </div>
                <span
                  className={`${
                    data.rank === 1 ? "text-xl" : "text-base"
                  } font-bold text-foreground`}
                >
                  $
                  {new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(data.portfolio)}
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
                  <Target
                    className={`${
                      data.rank === 1 ? "w-4 h-4" : "w-3.5 h-3.5"
                    } text-blue-400`}
                  />
                  <span className="font-medium">{t("winRate")}</span>
                </div>
                <span
                  className={`${
                    data.rank === 1 ? "text-xl" : "text-base"
                  } font-bold text-foreground`}
                >
                  {data.winRate.toFixed(2)}%
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
                  <span className="font-medium">{t("trades")}</span>
                </div>
                <span
                  className={`${
                    data.rank === 1 ? "text-xl" : "text-base"
                  } font-bold text-foreground`}
                >
                  {data.trades}
                </span>
              </div>
              <div
                className={`flex items-center justify-between ${
                  data.rank === 1 ? "py-2.5" : "py-2"
                }`}
              >
                <div
                  className={`flex items-center ${
                    data.rank === 1 ? "gap-2.5" : "gap-2"
                  } ${data.rank === 1 ? "" : "text-sm "}text-muted-foreground`}
                >
                  <Zap
                    className={`${
                      data.rank === 1 ? "w-4 h-4" : "w-3.5 h-3.5"
                    } text-emerald-400`}
                  />
                  <span className="font-medium">{t("winStreak")}</span>
                </div>
                <span
                  className={`${
                    data.rank === 1 ? "text-xl" : "text-base"
                  } font-bold text-foreground`}
                >
                  {data.winStreak}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reflection */}
        <div
          className="absolute left-0 overflow-hidden"
          style={{
            top: reflectionStyles.top || "510px",
            width: reflectionStyles.width === "96" ? "24rem" : "20rem",
            height: reflectionStyles.height || "150px",
            transform: reflectionStyles.transform,
            borderRadius: reflectionStyles.borderRadius,
            clipPath: reflectionStyles.clipPath,
            boxShadow: reflectionStyles.boxShadow,
            opacity: reflectionStyles.opacity,
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
TraderCard.displayName = "TraderCard";

// Mobile Trader Card Component
const MobileTraderCard = memo(
  ({ data, useDummyData }: { data: CardData; useDummyData: boolean }) => {
    const t = useTranslations("traderRanking");

    const getRankStyle = (rank: number) => {
      switch (rank) {
        case 1:
          return {
            border: "border-yellow-400",
            bg: "bg-yellow-50 dark:bg-yellow-950/20",
            text: "text-yellow-800 dark:text-yellow-200",
            badge: "bg-yellow-500 text-white",
          };
        case 2:
          return {
            border: "border-slate-400",
            bg: "bg-slate-50 dark:bg-slate-950/20",
            text: "text-slate-800 dark:text-slate-200",
            badge: "bg-slate-500 text-white",
          };
        case 3:
          return {
            border: "border-amber-500",
            bg: "bg-amber-50 dark:bg-amber-950/20",
            text: "text-amber-800 dark:text-amber-200",
            badge: "bg-amber-600 text-white",
          };
        default:
          return {
            border: "border-border",
            bg: "bg-background",
            text: "text-foreground",
            badge: "bg-muted text-muted-foreground",
          };
      }
    };

    const style = getRankStyle(data.rank);

    return (
      <div
        className={`relative rounded-xl border-2 ${style.border} ${style.bg} p-4 shadow-sm`}
      >
        {/* Rank Badge */}
        <div className="absolute -top-3 left-4">
          <div
            className={`${style.badge} w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md`}
          >
            {data.rank}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          {/* Avatar */}
          <Avatar className="w-16 h-16 ring-2 ring-border/30">
            <AvatarImage src={data.avatar_url || undefined} alt={data.name} />
            <AvatarFallback className="font-semibold text-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              {data.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">{data.name}</h3>
            <p className="text-sm text-muted-foreground">{data.username}</p>
          </div>

          {/* Total Return */}
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{data.totalReturn.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {t("totalReturn")}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">{t("portfolio")}</span>
            </div>
            <span className="font-semibold text-foreground">
              $
              {new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(data.portfolio)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">{t("winRate")}</span>
            </div>
            <span className="font-semibold text-foreground">
              {data.winRate.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">{t("trades")}</span>
            </div>
            <span className="font-semibold text-foreground">{data.trades}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">{t("winStreak")}</span>
            </div>
            <span className="font-semibold text-foreground">
              {data.winStreak}
            </span>
          </div>
        </div>

        {/* Follow Button */}
        <div className="mt-4">
          {useDummyData ? (
            <Button
              className={`w-full ${
                data.rank === 1
                  ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 hover:from-yellow-500/40 hover:to-yellow-600/40 text-yellow-800 dark:text-yellow-100 border border-yellow-400/60 font-semibold shadow-md hover:shadow-lg"
                  : data.rank === 2
                  ? "bg-slate-500/30 hover:bg-slate-500/40 text-slate-700 dark:text-slate-100 border border-slate-400/50 font-semibold shadow-sm hover:shadow-md"
                  : "bg-amber-600/30 hover:bg-amber-600/40 text-amber-800 dark:text-amber-200 border border-amber-500/50 font-semibold shadow-sm hover:shadow-md"
              } transition-all duration-300`}
              variant="outline"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Follow
            </Button>
          ) : (
            <RankingFollowButton
              targetUserId={data.id}
              rank={data.rank}
              className={`w-full ${
                data.rank === 1
                  ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 hover:from-yellow-500/40 hover:to-yellow-600/40 text-yellow-800 dark:text-yellow-100 border border-yellow-400/60 font-semibold shadow-md hover:shadow-lg"
                  : data.rank === 2
                  ? "bg-slate-500/30 hover:bg-slate-500/40 text-slate-700 dark:text-slate-100 border border-slate-400/50 font-semibold shadow-sm hover:shadow-md"
                  : "bg-amber-600/30 hover:bg-amber-600/40 text-amber-800 dark:text-amber-200 border border-amber-500/50 font-semibold shadow-sm hover:shadow-md"
              } transition-all duration-300`}
            />
          )}
        </div>
      </div>
    );
  }
);
MobileTraderCard.displayName = "MobileTraderCard";

export const TraderRanking = memo(() => {
  // const t = useTranslations("traderRanking");
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>("daily");
  const [traders, setTraders] = useState<TraderData[]>([]);
  const [useDummyData, setUseDummyData] = useState(false);

  // Fetch trader data from Supabase
  const fetchTraderData = async (timeFrame: TimeFrame) => {
    try {
      const supabase = createClient();
      let viewName = "";

      switch (timeFrame) {
        case "daily":
          viewName = "daily_trader_leaderboard";
          break;
        case "weekly":
          viewName = "weekly_trader_leaderboard";
          break;
        case "monthly":
          viewName = "monthly_trader_leaderboard";
          break;
      }

      const { data, error } = await supabase
        .from(viewName)
        .select("*")
        .limit(10);

      if (error) {
        console.error("Error fetching trader data:", error);
        setUseDummyData(true);
        setTraders(getDummyTraders(timeFrame));
        return;
      }

      if (data && data.length > 0) {
        setUseDummyData(false);
        setTraders(data);
      } else {
        setUseDummyData(true);
        setTraders(getDummyTraders(timeFrame));
      }
    } catch (error) {
      console.error("Error fetching trader data:", error);
      setUseDummyData(true);
      setTraders(getDummyTraders(timeFrame));
    }
  };

  // Fetch data on component mount and time frame change
  useEffect(() => {
    fetchTraderData(selectedTimeFrame);
  }, [selectedTimeFrame]);

  // Real-time subscription for trading room positions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("trading_room_positions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_positions",
        },
        () => {
          fetchTraderData(selectedTimeFrame);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTimeFrame]);

  // Convert trader data to card data format
  const cardData = useMemo(() => {
    const top3Traders = traders.slice(0, 3);

    return top3Traders.map((trader, index) => ({
      id: trader.id,
      rank: index + 1,
      name: trader.nickname,
      username: `@${trader.nickname.toLowerCase().replace(/\s+/g, "")}`,
      avatar_url: trader.avatar_url,
      totalReturn: trader.total_return,
      portfolio: trader.portfolio_value,
      winRate: trader.win_rate,
      trades: trader.total_trades,
      winStreak: Math.floor(Math.random() * 20) + 1, // Random streak for now
      position:
        index === 0
          ? "center" // 1st place in center
          : index === 1
          ? "left" // 2nd place on left
          : ("right" as CardPosition), // 3rd place on right
      color:
        index === 0 ? "gold" : index === 1 ? "silver" : ("bronze" as CardColor),
      isOnline: trader.isOnline,
    }));
  }, [traders]);

  return (
    <div className="space-y-16 mb-20">
      {/* Time Frame Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 mt-8 gap-4">
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

      {/* Desktop Layout - Olympic Podium */}
      <div
        className="relative min-h-[700px] hidden lg:flex items-center justify-center gap-12 px-8"
        style={{ perspective: "1200px" }}
      >
        {cardData.length >= 3 &&
          (() => {
            // Olympic podium order: 2nd (left), 1st (center), 3rd (right)
            const podiumOrder = [1, 0, 2]; // 2nd place, 1st place, 3rd place
            return podiumOrder.map((cardIndex) => {
              const card = cardData[cardIndex];
              if (!card) return null;
              return (
                <TraderCard
                  key={`${card.id}-${card.rank}`}
                  data={card}
                  useDummyData={useDummyData}
                />
              );
            });
          })()}
      </div>

      {/* Mobile Layout - Simple Cards */}
      <div className="lg:hidden space-y-4 px-4 -mt-8">
        {cardData.slice(0, 3).map((card) => (
          <MobileTraderCard
            key={`${card.id}-${card.rank}`}
            data={card}
            useDummyData={useDummyData}
          />
        ))}
      </div>

      {/* Full Leaderboard Table Section */}
      <div className="mt-12">
        <TraderRankingTable
          traders={traders}
          selectedTimeFrame={selectedTimeFrame}
          onTimeFrameChange={setSelectedTimeFrame}
        />
      </div>
    </div>
  );
});

TraderRanking.displayName = "TraderRanking";
