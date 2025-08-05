"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_RANKINGS_DATA,
  rankingsData,
  type RankingCategory,
} from "./rankings-data";

// Types for real data
interface TraderData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_return: number;
  portfolio_value: number;
  rank?: number;
}

interface ActivityData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_exp: number;
  rank?: number;
}

interface DonationData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_donation: number;
  rank?: number;
}

interface FollowersData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_followers: number;
  rank?: number;
}

// Union type for all data types
type RankingData = TraderData | ActivityData | DonationData | FollowersData;

// Data structure type
interface RankingsData {
  returnRateData: TraderData[];
  virtualMoneyData: TraderData[];
  activityData: ActivityData[];
  donationData: DonationData[];
  followersData: FollowersData[];
}

const VALUE_COLORS = {
  returnRate: "text-emerald-600 dark:text-emerald-400",
  virtualMoney: "text-blue-600 dark:text-blue-400",
  activityXp: "text-purple-600 dark:text-purple-400",
  sponsored: "text-orange-600 dark:text-orange-400",
  mostFollowed: "text-pink-600 dark:text-pink-400",
} as const;

const ICON_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
] as const;

const RANK_BADGE_CLASSES = {
  1: "bg-yellow-500 text-black",
  2: "bg-gray-400 text-black",
  3: "bg-orange-500 text-black",
  default: "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-white",
} as const;

interface RankingCardProps {
  category: RankingCategory;
  t: (key: string) => string;
  realData?: RankingData[];
  isLoading: boolean;
}

// Helper function to fill data with demo entries
const fillWithDemoData = (
  realData: RankingData[],
  demoData: RankingData[],
  category: string
): RankingData[] => {
  const remainingSlots = 5 - realData.length;
  if (remainingSlots <= 0) return realData;

  const demoEntries = demoData.slice(0, remainingSlots).map((demo, index) => ({
    ...demo,
    rank: realData.length + index + 1,
  }));

  return [...realData, ...demoEntries];
};

// Memoized RankingCard component for performance
const RankingCard = React.memo(
  ({ category, t, realData, isLoading }: RankingCardProps) => {
    const iconColor = useMemo(
      () => ICON_COLORS[rankingsData.indexOf(category)] || "bg-gray-500",
      [category]
    );

    const getRankBadgeClass = useCallback((rank: number) => {
      return (
        RANK_BADGE_CLASSES[rank as keyof typeof RANK_BADGE_CLASSES] ||
        RANK_BADGE_CLASSES.default
      );
    }, []);

    const formatValue = useCallback(
      (categoryTitle: string, data: RankingData) => {
        // Type-safe formatter calls with proper type guards
        switch (categoryTitle) {
          case "returnRate":
          case "virtualMoney":
            if ("total_return" in data && "portfolio_value" in data) {
              const traderData = data as TraderData;
              return categoryTitle === "returnRate"
                ? traderData.total_return
                  ? `+${traderData.total_return.toFixed(1)}%`
                  : "+0.0%"
                : traderData.portfolio_value
                ? `$${(traderData.portfolio_value / 1000).toFixed(0)}K`
                : "$0K";
            }
            break;
          case "activityXp":
            if ("total_exp" in data) {
              const activityData = data as ActivityData;
              return activityData.total_exp
                ? `${activityData.total_exp.toLocaleString()} XP`
                : "0 XP";
            }
            break;
          case "sponsored":
            if ("total_donation" in data) {
              const donationData = data as DonationData;
              return donationData.total_donation
                ? `${donationData.total_donation.toLocaleString()} coins`
                : "0 coins";
            }
            break;
          case "mostFollowed":
            if ("total_followers" in data) {
              const followersData = data as FollowersData;
              return followersData.total_followers
                ? `${(followersData.total_followers / 1000).toFixed(
                    0
                  )}K followers`
                : "0K followers";
            }
            break;
        }
        return "0";
      },
      []
    );

    const getValueColor = useCallback((categoryTitle: string) => {
      return (
        VALUE_COLORS[categoryTitle as keyof typeof VALUE_COLORS] ||
        "text-gray-600 dark:text-gray-400"
      );
    }, []);

    const displayData = useMemo(() => {
      return realData && realData.length > 0
        ? realData.slice(0, 5)
        : category.traders;
    }, [realData, category.traders]);

    // Memoized loading skeleton
    const loadingSkeleton = useMemo(
      () =>
        Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 animate-pulse">
            <div className="w-6 h-6 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
            <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-3/4"></div>
              <div className="h-2 bg-gray-300 dark:bg-slate-600 rounded w-1/2"></div>
            </div>
          </div>
        )),
      []
    );

    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700/30">
          <div
            className={`w-10 h-10 ${iconColor} rounded-xl flex items-center justify-center`}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={category.icon}
              />
            </svg>
          </div>
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
              {t(category.title)}
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              {t(category.subtitle)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading
            ? loadingSkeleton
            : displayData.map((trader, index) => {
                // Handle both real data and fallback data
                const isRealData = "id" in trader;
                const displayName = isRealData ? trader.nickname : trader.name;
                const avatarUrl = isRealData ? trader.avatar_url : undefined;
                const displayId = isRealData ? trader.id : `fallback-${index}`;

                return (
                  <div key={displayId} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadgeClass(
                        trader.rank || index + 1
                      )}`}
                    >
                      {trader.rank || index + 1}
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={avatarUrl || undefined}
                        alt={displayName}
                      />
                      <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                        {displayName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {displayName}
                      </p>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold text-sm ${getValueColor(
                            category.title
                          )}`}
                        >
                          {isRealData
                            ? formatValue(category.title, trader)
                            : trader.value}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-xs">
                          {"change" in trader ? trader.change : "(+0)"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    );
  }
);

RankingCard.displayName = "RankingCard";

// Optimized data fetching with parallel requests and caching
const useRankingsData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<RankingsData>({
    returnRateData: [],
    virtualMoneyData: [],
    activityData: [],
    donationData: [],
    followersData: [],
  });

  const fetchAllRankings = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Parallel data fetching for better performance
      const [
        returnRateResult,
        virtualMoneyResult,
        activityResult,
        donationResult,
        followersResult,
      ] = await Promise.allSettled([
        supabase
          .from("weekly_trader_leaderboard")
          .select("*")
          .order("total_return", { ascending: false })
          .limit(10),
        supabase
          .from("weekly_trader_leaderboard")
          .select("*")
          .order("portfolio_value", { ascending: false })
          .limit(10),
        supabase
          .from("weekly_exp_leaderboard")
          .select("*")
          .order("total_exp", { ascending: false })
          .limit(10),
        supabase
          .from("weekly_donation_leaderboard")
          .select("*")
          .order("total_donation", { ascending: false })
          .limit(10),
        supabase
          .from("weekly_followers_leaderboard")
          .select("*")
          .order("total_followers", { ascending: false })
          .limit(10),
      ]);

      const newData = {
        returnRateData:
          returnRateResult.status === "fulfilled" &&
          returnRateResult.value.data &&
          returnRateResult.value.data.length > 0
            ? (fillWithDemoData(
                returnRateResult.value.data.map((trader, index) => ({
                  ...trader,
                  rank: index + 1,
                })),
                DEMO_RANKINGS_DATA.returnRate,
                "returnRate"
              ) as TraderData[])
            : (fillWithDemoData(
                [],
                DEMO_RANKINGS_DATA.returnRate,
                "returnRate"
              ) as TraderData[]),
        virtualMoneyData:
          virtualMoneyResult.status === "fulfilled" &&
          virtualMoneyResult.value.data &&
          virtualMoneyResult.value.data.length > 0
            ? (fillWithDemoData(
                virtualMoneyResult.value.data.map((trader, index) => ({
                  ...trader,
                  rank: index + 1,
                })),
                DEMO_RANKINGS_DATA.virtualMoney,
                "virtualMoney"
              ) as TraderData[])
            : (fillWithDemoData(
                [],
                DEMO_RANKINGS_DATA.virtualMoney,
                "virtualMoney"
              ) as TraderData[]),
        activityData:
          activityResult.status === "fulfilled" &&
          activityResult.value.data &&
          activityResult.value.data.length > 0
            ? (fillWithDemoData(
                activityResult.value.data.map((user, index) => ({
                  ...user,
                  rank: index + 1,
                })),
                DEMO_RANKINGS_DATA.activity,
                "activity"
              ) as ActivityData[])
            : (fillWithDemoData(
                [],
                DEMO_RANKINGS_DATA.activity,
                "activity"
              ) as ActivityData[]),
        donationData:
          donationResult.status === "fulfilled" &&
          donationResult.value.data &&
          donationResult.value.data.length > 0
            ? (fillWithDemoData(
                donationResult.value.data.map((user, index) => ({
                  ...user,
                  rank: index + 1,
                })),
                DEMO_RANKINGS_DATA.donation,
                "donation"
              ) as DonationData[])
            : (fillWithDemoData(
                [],
                DEMO_RANKINGS_DATA.donation,
                "donation"
              ) as DonationData[]),
        followersData:
          followersResult.status === "fulfilled" &&
          followersResult.value.data &&
          followersResult.value.data.length > 0
            ? (fillWithDemoData(
                followersResult.value.data.map((user, index) => ({
                  ...user,
                  rank: index + 1,
                })),
                DEMO_RANKINGS_DATA.followers,
                "followers"
              ) as FollowersData[])
            : (fillWithDemoData(
                [],
                DEMO_RANKINGS_DATA.followers,
                "followers"
              ) as FollowersData[]),
      };

      setData(newData);
    } catch (error) {
      console.error("Error fetching rankings data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRankings();
  }, [fetchAllRankings]);

  return { data, isLoading };
};

// Optimized data mapping with memoization
const useCategoryData = (data: RankingsData, categoryTitle: string) => {
  return useMemo(() => {
    switch (categoryTitle) {
      case "returnRate":
        return data.returnRateData;
      case "virtualMoney":
        return data.virtualMoneyData;
      case "activityXp":
        return data.activityData;
      case "sponsored":
        return data.donationData;
      case "mostFollowed":
        return data.followersData;
      default:
        return [];
    }
  }, [data, categoryTitle]);
};

export function RankingsSection() {
  const t = useTranslations("rankings");
  const { data, isLoading } = useRankingsData();

  // Individual category data hooks
  const returnRateData = useCategoryData(data, "returnRate");
  const virtualMoneyData = useCategoryData(data, "virtualMoney");
  const activityData = useCategoryData(data, "activityXp");
  const sponsoredData = useCategoryData(data, "sponsored");
  const mostFollowedData = useCategoryData(data, "mostFollowed");

  // Memoize category data map
  const categoryDataMap = useMemo(() => {
    return new Map<string, RankingData[]>([
      ["returnRate", returnRateData],
      ["virtualMoney", virtualMoneyData],
      ["activityXp", activityData],
      ["sponsored", sponsoredData],
      ["mostFollowed", mostFollowedData],
    ]);
  }, [
    returnRateData,
    virtualMoneyData,
    activityData,
    sponsoredData,
    mostFollowedData,
  ]);

  return (
    <section className="py-12 sm:py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-blue-50 to-blue-100 dark:from-black dark:to-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_50%)]"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 px-4 py-1.5 text-sm">
            {t("topPerformers")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("communityLeaderboards")}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-4 sm:px-0">
            {t("leaderboardsDescription")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-slate-700/50">
            {rankingsData.map((category) => (
              <RankingCard
                key={category.title}
                category={category}
                t={t}
                realData={categoryDataMap.get(category.title)}
                isLoading={isLoading}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
