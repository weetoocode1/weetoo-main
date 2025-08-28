"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database, Hash, Shield, TrendingUp } from "lucide-react";

interface UidStats {
  totalUids: number;
  activeUids: number;
  totalExchanges: number;
  newUidsThisMonth: number;
}

export function AdminUidStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "uid-stats"],
    queryFn: async (): Promise<UidStats> => {
      const supabase = createClient();

      // Get total UIDs
      const { count: totalUids } = await supabase
        .from("user_broker_uids")
        .select("*", { count: "exact", head: true });

      // Get active UIDs
      const { count: activeUids } = await supabase
        .from("user_broker_uids")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get total unique exchanges
      const { data: exchangesData } = await supabase
        .from("exchanges")
        .select("id");

      const totalExchanges = exchangesData?.length || 0;

      // Get new UIDs this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newUidsThisMonth } = await supabase
        .from("user_broker_uids")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      return {
        totalUids: totalUids || 0,
        activeUids: activeUids || 0,
        totalExchanges,
        newUidsThisMonth: newUidsThisMonth || 0,
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
      title: "Total UIDs",
      value: stats?.totalUids || 0,
      description: "All registered UIDs",
      icon: Hash,
      color: "text-blue-600",
    },
    {
      title: "Active UIDs",
      value: stats?.activeUids || 0,
      description: "Currently active UIDs",
      icon: Shield,
      color: "text-green-600",
    },
    {
      title: "Total Exchanges",
      value: stats?.totalExchanges || 0,
      description: "Supported exchanges",
      icon: Database,
      color: "text-purple-600",
    },
    {
      title: "New This Month",
      value: stats?.newUidsThisMonth || 0,
      description: "UIDs added this month",
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
