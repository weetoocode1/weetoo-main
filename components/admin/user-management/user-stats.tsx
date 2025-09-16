"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Coins, Shield, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface UserStats {
  totalUsers: number;
  adminUsers: number;
  totalCoins: number;
  newUsersThisMonth: number;
}

export function UserStats() {
  const t = useTranslations("admin.userManagement.stats");
  const {
    data: stats,
    isLoading,
    // refetch,
  } = useQuery({
    queryKey: ["admin", "user-stats"],
    queryFn: async (): Promise<UserStats> => {
      const supabase = createClient();

      // Get total users
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get admin users
      const { count: adminUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .in("role", ["admin", "super_admin"]);

      // Get total coins
      const { data: usersData } = await supabase
        .from("users")
        .select("kor_coins");

      const totalCoins =
        usersData?.reduce((sum, user) => sum + (user.kor_coins || 0), 0) || 0;

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newUsersThisMonth } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      return {
        totalUsers: totalUsers || 0,
        adminUsers: adminUsers || 0,
        totalCoins,
        newUsersThisMonth: newUsersThisMonth || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Refresh stats mutation
  // const refreshStatsMutation = useMutation({
  //   mutationFn: async () => {
  //     await refetch();
  //   },
  //   onSuccess: () => {
  //     // Stats refreshed successfully
  //   },
  //   onError: (error) => {
  //     console.error("Error refreshing stats:", error);
  //   },
  // });

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
      title: t("totalUsers.title"),
      value: stats?.totalUsers || 0,
      description: t("totalUsers.description"),
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: t("adminUsers.title"),
      value: stats?.adminUsers || 0,
      description: t("adminUsers.description"),
      icon: Shield,
      color: "text-purple-600",
    },
    {
      title: t("totalCoins.title"),
      value: stats?.totalCoins.toLocaleString() || "0",
      description: t("totalCoins.description"),
      icon: Coins,
      color: "text-yellow-600",
    },
    {
      title: t("newUsersThisMonth.title"),
      value: stats?.newUsersThisMonth || 0,
      description: t("newUsersThisMonth.description"),
      icon: TrendingUp,
      color: "text-emerald-600",
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
