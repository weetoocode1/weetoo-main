"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { DollarSign, Users, TrendingUp, CheckCircle } from "lucide-react";

interface RebateStats {
  totalEarned: number;
  totalPaidOut: number;
  totalPending: number;
  activeUsers: number;
  conversionRate: number;
}

export function RebateStats() {
  const t = useTranslations("admin.rebateManagement.stats");
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "rebate-stats"],
    queryFn: async (): Promise<RebateStats> => {
      const supabase = createClient();

      // Get total earned from broker_rebates
      const { data: brokerRebates } = await supabase
        .from("broker_rebates")
        .select("total_rebate_amount");

      const totalEarned =
        brokerRebates?.reduce(
          (sum, rebate) => sum + (rebate.total_rebate_amount || 0),
          0
        ) || 0;

      // Get total paid out from completed withdrawals
      const { data: completedWithdrawals } = await supabase
        .from("broker_rebate_withdrawals")
        .select("amount_usd")
        .eq("status", "completed");

      const totalPaidOut =
        completedWithdrawals?.reduce(
          (sum, withdrawal) => sum + (withdrawal.amount_usd || 0),
          0
        ) || 0;

      // Get total pending from pending withdrawals
      const { data: pendingWithdrawals } = await supabase
        .from("broker_rebate_withdrawals")
        .select("amount_usd")
        .eq("status", "pending");

      const totalPending =
        pendingWithdrawals?.reduce(
          (sum, withdrawal) => sum + (withdrawal.amount_usd || 0),
          0
        ) || 0;

      // Get active users (users with linked UIDs)
      const { count: activeUsers } = await supabase
        .from("user_broker_uids")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get total registered users
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      const conversionRate =
        totalUsers && totalUsers > 0
          ? ((activeUsers || 0) / totalUsers) * 100
          : 0;

      return {
        totalEarned,
        totalPaidOut,
        totalPending,
        activeUsers: activeUsers || 0,
        conversionRate,
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
      title: t("totalEarned.title"),
      value: `$${stats?.totalEarned.toFixed(2) || "0.00"}`,
      description: t("totalEarned.description"),
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: t("totalPaidOut.title"),
      value: `$${stats?.totalPaidOut.toFixed(2) || "0.00"}`,
      description: t("totalPaidOut.description"),
      icon: CheckCircle,
      color: "text-blue-600",
    },
    {
      title: t("pendingWithdrawals.title"),
      value: `$${stats?.totalPending.toFixed(2) || "0.00"}`,
      description: t("pendingWithdrawals.description"),
      icon: TrendingUp,
      color: "text-yellow-600",
    },
    {
      title: t("activeUsers.title"),
      value: stats?.activeUsers || 0,
      description: t("activeUsers.description", {
        rate: stats?.conversionRate.toFixed(1) || "0.0",
      }),
      icon: Users,
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
