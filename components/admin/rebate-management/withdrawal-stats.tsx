"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, DollarSign, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface WithdrawalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalWithdrawable: number;
  totalUids: number;
}

export function WithdrawalStats() {
  const t = useTranslations("admin.rebateManagement.stats");
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "withdrawal-stats"],
    queryFn: async (): Promise<WithdrawalStats> => {
      const supabase = createClient();

      const [withdrawalsResult, uidsResult] = await Promise.all([
        supabase.from("broker_rebate_withdrawals").select("status"),
        supabase.from("user_broker_uids").select("withdrawable_balance"),
      ]);

      const stats: WithdrawalStats = {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalWithdrawable: 0,
        totalUids: 0,
      };

      if (withdrawalsResult.data && Array.isArray(withdrawalsResult.data)) {
        console.log(
          "📊 Stats: Processing withdrawals:",
          withdrawalsResult.data.length
        );
        withdrawalsResult.data.forEach((withdrawal) => {
          if (withdrawal?.status === "pending") {
            stats.totalPending++;
            console.log("📊 Found pending withdrawal:", withdrawal);
          }
          if (withdrawal?.status === "approved") stats.totalApproved++;
          if (withdrawal?.status === "rejected") stats.totalRejected++;
        });
        console.log("📊 Stats calculated - Pending:", stats.totalPending);
      } else {
        console.log("📊 Stats: No withdrawals data received");
      }

      if (uidsResult.data && Array.isArray(uidsResult.data)) {
        uidsResult.data.forEach((uid) => {
          stats.totalWithdrawable += Number(uid?.withdrawable_balance) || 0;
        });
        stats.totalUids = uidsResult.data.length;
      }

      return stats;
    },
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("admin-withdrawal-stats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broker_rebate_withdrawals" },
        (payload) => {
          console.log("🔄 Stats: Realtime event received:", payload);
          queryClient.refetchQueries({
            queryKey: ["admin", "withdrawal-stats"],
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_broker_uids" },
        (payload) => {
          console.log("🔄 Stats: UID update received:", payload);
          queryClient.refetchQueries({
            queryKey: ["admin", "withdrawal-stats"],
          });
        }
      )
      .subscribe((status) => {
        console.log("📡 Stats: Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Stats: Successfully subscribed");
        }
      });

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
          console.log("🧹 Stats: Cleaned up realtime subscription");
        } catch (error) {
          console.error("Error removing stats channel:", error);
        }
      }
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative">
            <Card className="border border-border rounded-none shadow-none">
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
      title: t("pendingRequests.title"),
      value: stats?.totalPending || 0,
      description: t("pendingRequests.description"),
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: t("approved.title"),
      value: stats?.totalApproved || 0,
      description: t("approved.description"),
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: t("totalWithdrawable.title"),
      value: `$${stats?.totalWithdrawable.toFixed(2) || "0.00"}`,
      description: t("totalWithdrawable.description"),
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      title: t("totalUids.title"),
      value: stats?.totalUids || 0,
      description: t("totalUids.description"),
      icon: Users,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="relative">
            <Card className="border border-border rounded-none shadow-none hover:shadow-sm transition-shadow">
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
