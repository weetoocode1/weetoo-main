"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const BROKERS = [
  { id: "deepcoin", name: "DeepCoin", logo: "/broker/deepcoin.png" },
  { id: "bingx", name: "BingX", logo: "/broker/bingx.png" },
  { id: "orangex", name: "OrangeX", logo: "/broker/orangex.webp" },
  { id: "lbank", name: "LBank", logo: "/broker/Lbank.png" },
];

interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_broker_uid_id: string;
  amount_usd: number;
  currency: string;
  status: string;
  exchange_id: string;
  broker_uid: string;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  user_broker_uids: {
    exchange_id: string;
    uid: string;
    accumulated_24h_payback: number;
    withdrawn_amount: number;
    withdrawable_balance: number;
  };
  users?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export function WithdrawalManagementTable() {
  const t = useTranslations("admin.rebateManagement.withdrawalManagementTable");
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [isUiBusy, setIsUiBusy] = useState(false);

  useEffect(() => {
    setIsUiBusy(true);
    const timer = setTimeout(() => setIsUiBusy(false), 150);
    return () => clearTimeout(timer);
  }, []);

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin", "withdrawal-management"],
    queryFn: async (): Promise<WithdrawalRequest[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("broker_rebate_withdrawals")
        .select(
          `
          id,
          user_id,
          user_broker_uid_id,
          amount_usd,
          currency,
          status,
          exchange_id,
          broker_uid,
          created_at,
          updated_at,
          processed_at,
          user_broker_uids!inner (
            exchange_id,
            uid,
            accumulated_24h_payback,
            withdrawn_amount,
            withdrawable_balance
          ),
          users!broker_rebate_withdrawals_user_id_fkey (
            email,
            first_name,
            last_name
          )
        `
        )
        .in("status", ["pending", "approved", "rejected"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching withdrawal management data:", error);
        throw error;
      }

      console.log("Fetched withdrawal requests:", data?.length || 0);
      return (Array.isArray(data)
        ? data
        : []) as unknown as WithdrawalRequest[];
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("admin-withdrawal-management-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "broker_rebate_withdrawals",
        },
        (payload) => {
          console.log("🔄 Realtime INSERT event received:", payload);
          const status = payload.new?.status;
          const broker = BROKERS.find((b) => b.id === payload.new?.exchange_id);
          const brokerName =
            broker?.name ||
            payload.new?.exchange_id?.toUpperCase() ||
            "Unknown";
          const uid = payload.new?.broker_uid || "";
          const amount = Number(payload.new?.amount_usd) || 0;

          console.log("📢 Processing new withdrawal INSERT:", {
            brokerName,
            uid,
            amount,
            status,
            statusType: typeof status,
          });

          const isPending =
            status === "pending" || String(status)?.toLowerCase() === "pending";

          if (isPending) {
            console.log("📢 Showing toast for pending withdrawal");
            const toastMessage = t("toast.newRequestReceived");
            const toastDescription = `${brokerName} - UID: ${uid} - Amount: $${amount.toFixed(
              2
            )}`;

            console.log("📢 Toast data:", { toastMessage, toastDescription });

            toast.info(toastMessage, {
              description: toastDescription,
              duration: 5000,
            });

            console.log("✅ Toast.info executed");
          } else {
            console.log(
              "⚠️ Status is not pending, skipping toast. Status:",
              status
            );
          }

          queryClient.refetchQueries({
            queryKey: ["admin", "withdrawal-management"],
          });
          queryClient.refetchQueries({
            queryKey: ["admin", "withdrawal-stats"],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "broker_rebate_withdrawals",
        },
        (payload) => {
          console.log("🔄 Realtime UPDATE event received:", payload);
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;

          if (newStatus !== oldStatus) {
            queryClient.refetchQueries({
              queryKey: ["admin", "withdrawal-management"],
            });
            queryClient.refetchQueries({
              queryKey: ["admin", "withdrawal-stats"],
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log(
            "✅ Successfully subscribed to broker_rebate_withdrawals"
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel error in realtime subscription");
        } else if (status === "TIMED_OUT") {
          console.error("⏱️ Realtime subscription timed out");
        } else if (status === "CLOSED") {
          console.warn("⚠️ Realtime subscription closed");
        }
      });

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
          console.log("🧹 Cleaned up realtime subscription");
        } catch (error) {
          console.error("Error removing channel:", error);
        }
      }
    };
  }, [queryClient, t]);

  const handleStatusUpdate = async (
    withdrawalId: string,
    newStatus: "pending" | "approved" | "rejected" | null
  ) => {
    setIsUpdating((prev) => ({ ...prev, [withdrawalId]: true }));
    try {
      const response = await fetch("/api/admin/update-withdrawal-status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          withdrawal_id: withdrawalId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        toast.success(t("toast.statusUpdated"));
        queryClient.refetchQueries({
          queryKey: ["admin", "withdrawal-management"],
        });
        queryClient.refetchQueries({
          queryKey: ["admin", "withdrawal-stats"],
        });
      } else {
        const error = await response.json();
        toast.error(error.error || t("toast.updateFailed"));
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(t("toast.withdrawalUpdateFailed"));
    } finally {
      setIsUpdating((prev) => ({ ...prev, [withdrawalId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-green-100 text-green-800 border border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("status.approved")}
          </div>
        );
      case "pending":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.pending")}
          </div>
        );
      case "rejected":
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            {t("status.rejected")}
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-muted text-muted-foreground">
            {t("status.noRequest")}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-10">
        <div className="border border-border rounded-none">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 border border-border/30"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-10">
      <div className="relative">
        {isUiBusy && (
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary/70 animate-pulse z-10" />
        )}
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
                      {t("columns.user")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.brokerUid")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.accumulated")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.withdrawn")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.withdrawable")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.status")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals?.map((withdrawal) => {
                    const broker = BROKERS.find(
                      (b) => b.id === withdrawal.exchange_id
                    );
                    const canChangeStatus = withdrawal.status !== "approved";

                    return (
                      <tr
                        key={withdrawal.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {withdrawal.users?.first_name ||
                              withdrawal.users?.last_name
                                ? `${withdrawal.users.first_name || ""} ${
                                    withdrawal.users.last_name || ""
                                  }`.trim()
                                : "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {withdrawal.users?.email ||
                                withdrawal.user_id.slice(0, 8) + "..."}
                            </div>
                          </div>
                        </td>
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
                                {withdrawal.broker_uid}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-sm">
                            $
                            {Number(
                              withdrawal.user_broker_uids
                                .accumulated_24h_payback
                            ).toFixed(4)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-sm text-blue-600">
                            ${Number(withdrawal.amount_usd).toFixed(4)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-sm text-emerald-600">
                            $
                            {Number(
                              withdrawal.user_broker_uids.withdrawable_balance
                            ).toFixed(4)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(withdrawal.status)}
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={withdrawal.status}
                            onValueChange={(value) => {
                              const newStatus = value as
                                | "pending"
                                | "approved"
                                | "rejected";
                              handleStatusUpdate(withdrawal.id, newStatus);
                            }}
                            disabled={
                              isUpdating[withdrawal.id] || !canChangeStatus
                            }
                          >
                            <SelectTrigger className="w-32 h-8 rounded-none text-xs shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                              <SelectItem value="pending">
                                {t("selectOptions.pending")}
                              </SelectItem>
                              <SelectItem value="approved">
                                {t("selectOptions.approved")}
                              </SelectItem>
                              <SelectItem value="rejected">
                                {t("selectOptions.rejected")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
              {withdrawals?.map((withdrawal) => {
                const broker = BROKERS.find(
                  (b) => b.id === withdrawal.exchange_id
                );
                const canChangeStatus = withdrawal.status !== "approved";

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
                            {withdrawal.broker_uid}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(withdrawal.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t("labels.user")}
                        </span>
                        <div className="font-medium">
                          {withdrawal.users?.email ||
                            withdrawal.user_id.slice(0, 8) + "..."}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("columns.withdrawable")}
                        </span>
                        <div className="font-mono font-medium text-emerald-600">
                          $
                          {Number(
                            withdrawal.user_broker_uids.withdrawable_balance
                          ).toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("columns.accumulated")}
                        </span>
                        <div className="font-mono font-medium">
                          $
                          {Number(
                            withdrawal.user_broker_uids.accumulated_24h_payback
                          ).toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("columns.withdrawn")}
                        </span>
                        <div className="font-mono font-medium text-blue-600">
                          ${Number(withdrawal.amount_usd).toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <Select
                      value={withdrawal.status}
                      onValueChange={(value) => {
                        const newStatus = value as
                          | "pending"
                          | "approved"
                          | "rejected";
                        handleStatusUpdate(withdrawal.id, newStatus);
                      }}
                      disabled={isUpdating[withdrawal.id] || !canChangeStatus}
                    >
                      <SelectTrigger className="w-full rounded-none shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="pending">
                          {t("selectOptions.pending")}
                        </SelectItem>
                        <SelectItem value="approved">
                          {t("selectOptions.approved")}
                        </SelectItem>
                        <SelectItem value="rejected">
                          {t("selectOptions.rejected")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          {(!withdrawals || withdrawals.length === 0) && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium mb-2">
                  {t("empty.title")}
                </div>
                <div className="text-sm">{t("empty.subtitle")}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
