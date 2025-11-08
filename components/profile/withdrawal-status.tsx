"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useBrokerRebateWithdrawals } from "@/hooks/use-broker-rebate-withdrawals";
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  Wallet,
  Calendar,
  DollarSign,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const BROKERS = [
  {
    id: "deepcoin",
    name: "DeepCoin",
    logo: "/broker/deepcoin.png",
  },
  {
    id: "bingx",
    name: "BingX",
    logo: "/broker/bingx.png",
  },
  {
    id: "orangex",
    name: "OrangeX",
    logo: "/broker/orangex.webp",
  },
  {
    id: "lbank",
    name: "LBank",
    logo: "/broker/Lbank.png",
  },
];

export function WithdrawalStatus() {
  const t = useTranslations("profile.withdrawalStatus");
  const queryClient = useQueryClient();
  const { data: withdrawals, isLoading } = useBrokerRebateWithdrawals();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("user-withdrawal-status-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broker_rebate_withdrawals" },
        (payload) => {
          console.log(
            "🔄 Withdrawal Status: Realtime event received:",
            payload
          );
          queryClient.refetchQueries({
            queryKey: ["broker-rebate-withdrawals"],
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_broker_uids" },
        (payload) => {
          console.log("🔄 Withdrawal Status: UID update received:", payload);
          queryClient.refetchQueries({
            queryKey: ["broker-rebate-withdrawals"],
          });
          queryClient.refetchQueries({
            queryKey: ["user-uids"],
          });
        }
      )
      .subscribe((status) => {
        console.log(
          "📡 Withdrawal Status: Realtime subscription status:",
          status
        );
        if (status === "SUBSCRIBED") {
          console.log("✅ Withdrawal Status: Successfully subscribed");
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            "❌ Withdrawal Status: Channel error in realtime subscription"
          );
        } else if (status === "TIMED_OUT") {
          console.error(
            "⏱️ Withdrawal Status: Realtime subscription timed out"
          );
        } else if (status === "CLOSED") {
          console.warn("⚠️ Withdrawal Status: Realtime subscription closed");
        }
      });

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
          console.log("🧹 Withdrawal Status: Cleaned up realtime subscription");
        } catch (error) {
          console.error("Error removing withdrawal status channel:", error);
        }
      }
    };
  }, [queryClient]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("status.approved")}
          </div>
        );
      case "pending":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.pending")}
          </div>
        );
      case "rejected":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            {t("status.rejected")}
          </div>
        );
      case "processing":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {t("status.processing")}
          </div>
        );
      case "completed":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("status.completed")}
          </div>
        );
      case "failed":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            {t("status.failed")}
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">
            {t("title") || "Withdrawal Status"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("description") ||
            "Track the status of your rebate withdrawal requests"}
        </p>
      </div>

      {!withdrawals ||
      !Array.isArray(withdrawals) ||
      withdrawals.length === 0 ? (
        <div className="relative">
          <div className="border border-border rounded-none">
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {t("emptyState.title") || "No withdrawal requests"}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("emptyState.description") ||
                  "You haven't submitted any withdrawal requests yet"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <div className="border border-border rounded-none">
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                          {t("columns.brokerUid")}
                        </th>
                        <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                          {t("columns.amount")}
                        </th>
                        <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                          {t("columns.status")}
                        </th>
                        <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                          {t("columns.requested")}
                        </th>
                        <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                          {t("columns.processed")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((withdrawal) => {
                        const broker = BROKERS.find(
                          (b) => b.id === withdrawal.exchange_id
                        );

                        return (
                          <tr
                            key={withdrawal.id}
                            className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {broker && (
                                  <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                    <Image
                                      src={broker.logo}
                                      alt={broker.name}
                                      width={24}
                                      height={24}
                                      className="object-contain rounded-full"
                                    />
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium">
                                    {broker?.name ||
                                      withdrawal.exchange_id.toUpperCase()}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {withdrawal.broker_uid ||
                                      withdrawal.user_broker_uids?.uid ||
                                      "N/A"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-semibold text-emerald-600">
                                  ${Number(withdrawal.amount_usd).toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  {withdrawal.currency}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(withdrawal.status)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {formatDate(withdrawal.created_at)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {withdrawal.processed_at ? (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(withdrawal.processed_at)}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:hidden">
                <div className="space-y-4 p-4">
                  {withdrawals.map((withdrawal) => {
                    const broker = BROKERS.find(
                      (b) => b.id === withdrawal.exchange_id
                    );

                    return (
                      <div
                        key={withdrawal.id}
                        className="border border-border/30 rounded-none p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {broker && (
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                <Image
                                  src={broker.logo}
                                  alt={broker.name}
                                  width={32}
                                  height={32}
                                  className="object-contain rounded-full"
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">
                                {broker?.name ||
                                  withdrawal.exchange_id.toUpperCase()}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {withdrawal.broker_uid ||
                                  withdrawal.user_broker_uids?.uid ||
                                  "N/A"}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(withdrawal.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border/30">
                          <div>
                            <span className="text-muted-foreground">
                              {t("columns.amount")}
                            </span>
                            <div className="flex items-center gap-1 font-semibold text-emerald-600">
                              <DollarSign className="w-3 h-3" />
                              <span className="font-mono">
                                ${Number(withdrawal.amount_usd).toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {withdrawal.currency}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {t("columns.requested")}
                            </span>
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className="w-3 h-3" />
                              {formatDate(withdrawal.created_at).split(",")[0]}
                            </div>
                          </div>
                          {withdrawal.processed_at && (
                            <div>
                              <span className="text-muted-foreground">
                                {t("columns.processed")}
                              </span>
                              <div className="flex items-center gap-1 text-xs">
                                <Calendar className="w-3 h-3" />
                                {
                                  formatDate(withdrawal.processed_at).split(
                                    ","
                                  )[0]
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
