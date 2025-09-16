"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle, Clock } from "lucide-react";

interface UserRebate {
  id: string;
  user_id: string;
  broker_uid: string;
  exchange_id: string;
  rebate_amount: number;
  status: "pending" | "withdrawable" | "withdrawn";
  created_at: string;
}

export function UserRebatesTable() {
  const t = useTranslations("admin.rebateManagement.userRebates");
  const { data: userRebates, isLoading } = useQuery({
    queryKey: ["admin", "user-rebates"],
    queryFn: async (): Promise<UserRebate[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("user_rebates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100); // Limit to recent 100 records

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "withdrawn":
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("status.withdrawn")}
          </Badge>
        );
      case "withdrawable":
        return (
          <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.withdrawable")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.pending")}
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
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
                    {t("columns.created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {userRebates?.map((rebate) => (
                  <tr
                    key={rebate.id}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {rebate.user_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {rebate.broker_uid}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-sm">
                        ${rebate.rebate_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(rebate.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(rebate.created_at).toLocaleDateString()}
                      </span>
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
            {userRebates?.map((rebate) => (
              <div
                key={rebate.id}
                className="border border-border/30 rounded-none p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm">
                      {rebate.user_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rebate.broker_uid}
                    </div>
                  </div>
                  {getStatusBadge(rebate.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("mobile.amount")}
                    </span>
                    <div className="font-mono font-medium">
                      ${rebate.rebate_amount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("mobile.created")}
                    </span>
                    <div className="text-sm">
                      {new Date(rebate.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* No Results */}
        {(!userRebates || userRebates.length === 0) && (
          <div className="p-8 text-center">
            <div className="text-muted-foreground">
              <div className="text-lg font-medium mb-2">{t("empty.title")}</div>
              <div className="text-sm">{t("empty.subtitle")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
