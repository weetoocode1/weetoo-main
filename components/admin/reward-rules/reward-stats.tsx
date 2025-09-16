"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Coins, Settings, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface RewardStats {
  totalRewards: number;
  totalExpAwarded: number;
  totalKorAwarded: number;
  activeRules: number;
}

export function RewardStats() {
  const t = useTranslations("admin.rewardRules.stats");
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "reward-stats"],
    queryFn: async (): Promise<RewardStats> => {
      const supabase = createClient();

      // Get total rewards count
      const { count: totalRewards } = await supabase
        .from("rewards")
        .select("*", { count: "exact", head: true });

      // Get total EXP awarded
      const { data: expData } = await supabase
        .from("rewards")
        .select("exp_delta");

      const totalExpAwarded =
        expData?.reduce((sum, reward) => sum + (reward.exp_delta || 0), 0) || 0;

      // Get total KOR awarded
      const { data: korData } = await supabase
        .from("rewards")
        .select("kor_delta");

      const totalKorAwarded =
        korData?.reduce((sum, reward) => sum + (reward.kor_delta || 0), 0) || 0;

      // Get active rules count
      const { count: activeRules } = await supabase
        .from("reward_rules")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      return {
        totalRewards: totalRewards || 0,
        totalExpAwarded,
        totalKorAwarded,
        activeRules: activeRules || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative">
            <Card className="border border-border rounded-none shadow-none">
              {/* Corner borders for skeleton */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <div className="p-2 border border-border rounded-none">
                  <Skeleton className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  const totalRewards = stats?.totalRewards ?? 0;
  const totalExpAwarded = stats?.totalExpAwarded ?? 0;
  const totalKorAwarded = stats?.totalKorAwarded ?? 0;
  const activeRules = stats?.activeRules ?? 0;

  const statCards = [
    {
      id: "total-rewards",
      title: t("totalRewards.title"),
      value: totalRewards,
      description: t("totalRewards.description"),
      icon: Users,
      color: "text-blue-600",
    },
    {
      id: "total-exp-awarded",
      title: t("totalExpAwarded.title"),
      value: totalExpAwarded.toLocaleString(),
      description: t("totalExpAwarded.description"),
      icon: TrendingUp,
      color: "text-amber-600",
    },
    {
      id: "total-kor-awarded",
      title: t("totalKorAwarded.title"),
      value: totalKorAwarded.toLocaleString(),
      description: t("totalKorAwarded.description"),
      icon: Coins,
      color: "text-emerald-600",
    },
    {
      id: "active-rules",
      title: t("activeRules.title"),
      value: activeRules,
      description: t("activeRules.description"),
      icon: Settings,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.id} className="relative">
            <Card className="border border-border rounded-none shadow-none hover:shadow-sm transition-shadow">
              {/* Corner borders */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="p-2 border border-border rounded-none">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
