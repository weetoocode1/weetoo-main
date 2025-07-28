"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { memo, useMemo } from "react";
import { TraderRankingTable } from "./trader-ranking-table";

// Define proper types
type CardColor = "gold" | "silver" | "bronze";
type CardPosition = "left" | "center" | "right";

interface CardData {
  rank: number;
  name: string;
  username: string;
  totalReturn: number;
  portfolio: number;
  winRate: number;
  trades: number;
  winStreak: number;
  position: CardPosition;
  color: CardColor;
  isOnline: boolean;
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
const CARD_DATA: CardData[] = [
  {
    rank: 2,
    name: "Sarah Kim",
    username: "@sarahkim",
    totalReturn: 98.6,
    portfolio: 986200,
    winRate: 79.1,
    trades: 287,
    winStreak: 8,
    position: "left",
    color: "silver",
    isOnline: false,
  },
  {
    rank: 1,
    name: "Alexander Chen",
    username: "@alexchen",
    totalReturn: 247.8,
    portfolio: 2847300,
    winRate: 94.2,
    trades: 542,
    winStreak: 23,
    position: "center",
    color: "gold",
    isOnline: true,
  },
  {
    rank: 3,
    name: "Michael Chen",
    username: "@michaelc",
    totalReturn: 76.3,
    portfolio: 763400,
    winRate: 77.8,
    trades: 198,
    winStreak: 5,
    position: "right",
    color: "bronze",
    isOnline: true,
  },
];

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
const OnlineIndicator = memo(({ isOnline }: { isOnline: boolean }) => (
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
      {isOnline ? "Online" : "Offline"}
    </span>
  </div>
));
OnlineIndicator.displayName = "OnlineIndicator";

// Memoized card component
const TraderCard = memo(({ data }: { data: CardData }) => {
  const cardStyles = useMemo(() => {
    const baseStyles = {
      boxShadow: "",
      backgroundImage: "",
      border: "none",
    };

    switch (data.color) {
      case "gold":
        return {
          ...baseStyles,
          boxShadow:
            "0 0 0 2px #f59e0b, 0 0 15px 4px rgba(245, 158, 11, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.15)",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(252, 211, 77, 0.08), transparent 40%)",
        };
      case "silver":
        return {
          ...baseStyles,
          boxShadow:
            "0 0 0 1.5px #cbd5e1, 0 0 10px 2px rgba(148, 163, 184, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(203, 213, 225, 0.05), transparent 40%)",
        };
      case "bronze":
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
  }, [data.color]);

  const reflectionStyles = useMemo((): ReflectionStyles => {
    const baseReflection: ReflectionStyles = {
      transform: "scaleY(-1)",
      borderRadius: "0 0 16px 16px",
      clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
      opacity: 0.45,
      blur: "blur(2px)",
    };

    switch (data.color) {
      case "gold":
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
      case "silver":
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
      case "bronze":
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
  }, [data.color]);

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
        }) scale(${data.rank === 1 ? "1" : data.rank === 2 ? "0.9" : "0.85"})`,
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
                  ? "bg-yellow-400/20 text-yellow-200 border border-yellow-400/60 px-4 py-2.5 text-base font-bold shadow-lg"
                  : data.rank === 2
                  ? "bg-slate-200/10 text-slate-200 border border-slate-400/50 px-3.5 py-2 text-sm font-semibold shadow-md"
                  : "bg-amber-700/20 text-amber-300 border border-amber-500/50 px-3.5 py-2 text-sm font-semibold shadow-md"
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
                    ? "text-emerald-300 text-3xl"
                    : "text-emerald-400 text-2xl"
                } font-bold`}
              >
                +{data.totalReturn}%
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Total Return
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
                data.color === "gold"
                  ? "ring-yellow-400/30"
                  : data.color === "silver"
                  ? "ring-slate-400/20"
                  : "ring-amber-500/20"
              }`}
            >
              <AvatarImage src={``} alt={data.name} />
              <AvatarFallback
                className={
                  data.color === "gold"
                    ? "bg-yellow-500/20 text-yellow-300 text-xl font-bold"
                    : data.color === "silver"
                    ? "bg-slate-500/20 text-slate-300 font-semibold text-lg"
                    : "bg-amber-600/20 text-amber-300 font-semibold text-lg"
                }
              >
                {data.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
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
              <p className="text-sm text-muted-foreground">{data.username}</p>
              <OnlineIndicator isOnline={data.isOnline} />
            </div>
          </div>

          <Button
            className={`w-full ${data.rank === 1 ? "mb-6" : "mb-5"} ${
              data.color === "gold"
                ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 hover:from-yellow-500/40 hover:to-yellow-600/40 text-yellow-100 border border-yellow-400/60 font-semibold h-11 text-base shadow-md hover:shadow-lg"
                : data.color === "silver"
                ? "bg-slate-500/30 hover:bg-slate-500/40 text-slate-100 border border-slate-400/50 font-semibold h-10 shadow-sm hover:shadow-md"
                : "bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/50 font-semibold h-10 shadow-sm hover:shadow-md"
            } transition-all duration-300`}
            variant="outline"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Follow Trader
          </Button>

          <div
            className={`${data.rank === 1 ? "space-y-4" : "space-y-3"} flex-1`}
          >
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
                  } text-emerald-400`}
                />
                <span className="font-medium">Portfolio</span>
              </div>
              <span
                className={`${
                  data.rank === 1 ? "text-xl" : "text-base"
                } font-bold text-foreground`}
              >
                ${new Intl.NumberFormat("en-US").format(data.portfolio)}
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
                <span className="font-medium">Win Rate</span>
              </div>
              <span
                className={`${
                  data.rank === 1 ? "text-xl" : "text-base"
                } font-bold text-foreground`}
              >
                {data.winRate}%
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
                <span className="font-medium">Win Streak</span>
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
});
TraderCard.displayName = "TraderCard";

export const TraderRanking = memo(() => {
  return (
    <div className="space-y-16 mb-20">
      <div
        className="relative min-h-[700px] flex items-center justify-center gap-12 px-8"
        style={{ perspective: "1200px" }}
      >
        {CARD_DATA.map((cardData) => (
          <TraderCard key={cardData.rank} data={cardData} />
        ))}
      </div>

      {/* Full Leaderboard Table Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6 text-center sm:text-left">
          Full Leaderboard
        </h2>
        <TraderRankingTable />
      </div>
    </div>
  );
});

TraderRanking.displayName = "TraderRanking";
