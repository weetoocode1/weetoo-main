"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Coins, TrendingUp, Users, Activity } from "lucide-react";
import { useTranslations } from "next-intl";

interface KorCoinsStats {
  totalCoins: number;
  totalUsers: number;
  totalTransactions: number;
  averageBalance: number;
}

export function KorCoinsStats() {
  const t = useTranslations("admin.korCoins.stats");
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "kor-coins-stats"],
    queryFn: async (): Promise<KorCoinsStats> => {
      const supabase = createClient();

      // Get total coins in circulation
      const { data: usersData } = await supabase
        .from("users")
        .select("kor_coins");

      const totalCoins =
        usersData?.reduce((sum, user) => sum + (user.kor_coins || 0), 0) || 0;

      // Get total users with KOR coins
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get total transactions from localStorage adjustments
      let totalTransactions = 0;
      try {
        if (typeof window !== "undefined") {
          const storedAdjustments = localStorage.getItem("korCoinsAdjustments");
          if (storedAdjustments) {
            const adjustments = JSON.parse(storedAdjustments);
            totalTransactions = adjustments.length;
          }
        }
      } catch (error) {
        console.warn("Failed to parse KOR coins adjustments:", error);
      }

      // Calculate average balance
      const averageBalance =
        (totalUsers || 0) > 0 ? Math.round(totalCoins / (totalUsers || 1)) : 0;

      return {
        totalCoins,
        totalUsers: totalUsers || 0,
        totalTransactions,
        averageBalance,
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

  const statCards = [
    {
      title: t("totalCoins.title"),
      value: stats?.totalCoins.toLocaleString() || "0",
      description: t("totalCoins.description"),
      icon: Coins,
      color: "text-yellow-600",
    },
    {
      title: t("activeUsers.title"),
      value: stats?.totalUsers || 0,
      description: t("activeUsers.description"),
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: t("totalTransactions.title"),
      value: stats?.totalTransactions || 0,
      description: t("totalTransactions.description"),
      icon: Activity,
      color: "text-green-600",
    },
    {
      title: t("averageBalance.title"),
      value: stats?.averageBalance.toLocaleString() || "0",
      description: t("averageBalance.description"),
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="relative">
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
