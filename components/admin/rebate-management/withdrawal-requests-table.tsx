"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_broker_uid_id: string;
  amount_usd: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "rejected";
  exchange_id: string;
  broker_uid: string;
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
  processed_by?: string;
  rejection_reason?: string;
  user_broker_uids?: {
    exchange_id: string;
    uid: string;
  }[];
}

export function WithdrawalRequestsTable() {
  const t = useTranslations("admin.rebateManagement.withdrawalRequests");
  const queryClient = useQueryClient();
  const [isUiBusy, setIsUiBusy] = useState(false);

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin", "withdrawal-requests"],
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
           processed_at,
           admin_notes,
           processed_by,
           rejection_reason,
           user_broker_uids!inner (
             exchange_id,
             uid
           )
         `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Realtime updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-withdrawals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broker_rebate_withdrawals" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["admin", "withdrawal-requests"],
          });
          queryClient.invalidateQueries({
            queryKey: ["admin", "rebate-stats"],
          });
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [queryClient]);

  const handleUpdateStatus = async (
    id: string,
    status: "completed" | "rejected"
  ) => {
    setIsUiBusy(true);
    try {
      const response = await fetch("/api/admin/broker-rebate-withdrawals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status,
        }),
      });

      if (response.ok) {
        toast.success(
          status === "completed"
            ? t("messages.withdrawalApproved")
            : t("messages.withdrawalRejected")
        );
        queryClient.invalidateQueries({
          queryKey: ["admin", "withdrawal-requests"],
        });
        queryClient.invalidateQueries({
          queryKey: ["admin", "rebate-stats"],
        });
      } else {
        const error = await response.json();
        toast.error(
          error.message ||
            (status === "completed"
              ? t("messages.approveFailed")
              : t("messages.rejectFailed"))
        );
      }
    } catch (error) {
      console.error(`Error ${status} withdrawal:`, error);
      toast.error(
        status === "completed"
          ? t("messages.approveError")
          : t("messages.rejectError")
      );
    } finally {
      setIsUiBusy(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("status.completed")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
            <RefreshCw className="w-3 h-3 mr-1" />
            {t("status.processing")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
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
    <div className="space-y-3">
      <div className="relative">
        {isUiBusy && (
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary/70 animate-pulse z-10" />
        )}
        <div className="border border-border rounded-none">
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.userId")}
                    </th>
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
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals?.map((withdrawal) => (
                    <tr
                      key={withdrawal.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">
                          {withdrawal.user_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">
                          {withdrawal.broker_uid}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-sm">
                          ${withdrawal.amount_usd.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(withdrawal.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {withdrawal.status === "pending" && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-none"
                                  >
                                    {t("actions.approve")}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-none">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t("dialogs.approve.title")}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("dialogs.approve.description", {
                                        amount: `$${withdrawal.amount_usd.toFixed(
                                          2
                                        )}`,
                                      })}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-none">
                                      {t("dialogs.approve.cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="rounded-none"
                                      onClick={() =>
                                        handleUpdateStatus(
                                          withdrawal.id,
                                          "completed"
                                        )
                                      }
                                    >
                                      {t("dialogs.approve.confirm")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-none"
                                  >
                                    {t("actions.reject")}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-none">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t("dialogs.reject.title")}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("dialogs.reject.description", {
                                        amount: `$${withdrawal.amount_usd.toFixed(
                                          2
                                        )}`,
                                      })}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-none">
                                      {t("dialogs.reject.cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="rounded-none bg-red-600 hover:bg-red-700"
                                      onClick={() =>
                                        handleUpdateStatus(
                                          withdrawal.id,
                                          "rejected"
                                        )
                                      }
                                    >
                                      {t("dialogs.reject.confirm")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          {withdrawal.status === "completed" && (
                            <span className="text-sm text-green-600 font-medium">
                              {t("actions.processed")}
                            </span>
                          )}
                          {withdrawal.status === "rejected" && (
                            <span className="text-sm text-red-600 font-medium">
                              {t("actions.rejected")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <div className="space-y-4 p-4">
              {withdrawals?.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="border border-border/30 rounded-none p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm">
                        {withdrawal.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {withdrawal.broker_uid}
                      </div>
                    </div>
                    {getStatusBadge(withdrawal.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t("mobile.amount")}
                      </span>
                      <div className="font-mono font-medium">
                        ${withdrawal.amount_usd.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("mobile.requested")}
                      </span>
                      <div className="text-sm">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {withdrawal.status === "pending" && (
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-none flex-1"
                          >
                            {t("actions.approve")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-none">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("dialogs.approve.title")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("dialogs.approve.description", {
                                amount: `$${withdrawal.amount_usd.toFixed(2)}`,
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-none">
                              {t("dialogs.approve.cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-none"
                              onClick={() =>
                                handleUpdateStatus(withdrawal.id, "completed")
                              }
                            >
                              {t("dialogs.approve.confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-none flex-1"
                          >
                            {t("actions.reject")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-none">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("dialogs.reject.title")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("dialogs.reject.description", {
                                amount: `$${withdrawal.amount_usd.toFixed(2)}`,
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-none">
                              {t("dialogs.reject.cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-none bg-red-600 hover:bg-red-700"
                              onClick={() =>
                                handleUpdateStatus(withdrawal.id, "rejected")
                              }
                            >
                              {t("dialogs.reject.confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* No Results */}
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
