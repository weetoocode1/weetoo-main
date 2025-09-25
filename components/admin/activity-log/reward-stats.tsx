"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Coins, Star, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

interface RewardStatsData {
  totalToday: number;
  expToday: number;
  korToday: number;
  korSpentToday: number;
}

export function RewardStats() {
  const t = useTranslations("admin.activityLog");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reward-stats"],
    queryFn: async (): Promise<RewardStatsData> => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

      const [
        { count: totalToday },
        { data: expRows },
        { data: korRows },
        { data: korSpentRows },
      ] = await Promise.all([
        supabase
          .from("rewards")
          .select("id", { count: "exact", head: true })
          .eq("day_bucket", today),
        supabase.from("rewards").select("exp_delta").eq("day_bucket", today),
        supabase.from("rewards").select("kor_delta").eq("day_bucket", today),
        supabase
          .from("market_purchases")
          .select("total_price")
          .gte("created_at", `${today}T00:00:00Z`)
          .lte("created_at", `${today}T23:59:59.999Z`),
      ]);

      const expToday = (expRows || []).reduce(
        (sum, r: { exp_delta: number }) => sum + (r.exp_delta || 0),
        0
      );
      const korToday = (korRows || []).reduce(
        (sum, r: { kor_delta: number }) => sum + (r.kor_delta || 0),
        0
      );
      const korSpentToday = (korSpentRows || []).reduce(
        (sum, r: { total_price: number }) => sum + (r.total_price || 0),
        0
      );

      return {
        totalToday: totalToday || 0,
        expToday,
        korToday,
        korSpentToday,
      };
    },
    staleTime: 60_000,
  });

  const statCards = [
    {
      title: t("stats.rewardsToday"),
      value: data?.totalToday ?? 0,
      icon: Timer,
      color: "text-blue-600",
    },
    {
      title: t("stats.expAwardedToday"),
      value: (data?.expToday ?? 0).toLocaleString(),
      icon: Star,
      color: "text-amber-600",
    },
    {
      title: t("stats.korAwardedToday"),
      value: (data?.korToday ?? 0).toLocaleString(),
      icon: Coins,
      color: "text-yellow-600",
    },
    {
      title: t("stats.korSpentToday"),
      value: (data?.korSpentToday ?? 0).toLocaleString(),
      icon: Coins,
      color: "text-red-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="border border-border rounded-none shadow-none"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((s, idx) => {
        const Icon = s.icon;
        return (
          <Card
            key={idx}
            className="border border-border rounded-none shadow-none hover:shadow-sm transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.title}
              </CardTitle>
              <div className="p-2 border border-border rounded-none">
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {idx === 0
                  ? t("statsDescriptions.rewardsToday")
                  : idx === 3
                  ? t("statsDescriptions.korSpentToday")
                  : t("statsDescriptions.sumAcross")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
