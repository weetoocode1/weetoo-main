"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface BrokerRebate {
  id: string;
  broker_uid: string;
  exchange_id: string;
  date: string;
  total_rebate_amount: number;
  currency: string;
  created_at: string;
}

export function BrokerRebatesTable() {
  const t = useTranslations("admin.rebateManagement.brokerRebates");
  const { data: brokerRebates, isLoading } = useQuery({
    queryKey: ["admin", "broker-rebates"],
    queryFn: async (): Promise<BrokerRebate[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("broker_rebates")
        .select("*")
        .order("date", { ascending: false })
        .limit(100); // Limit to recent 100 records

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

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
                <Skeleton className="h-4 w-24" />
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
                    {t("columns.brokerUid")}
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                    {t("columns.exchange")}
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                    {t("columns.date")}
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                    {t("columns.amount")}
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                    {t("columns.created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {brokerRebates?.map((rebate) => (
                  <tr
                    key={rebate.id}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {rebate.broker_uid}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium">
                        {rebate.exchange_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {new Date(rebate.date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-sm">
                        ${rebate.total_rebate_amount.toFixed(2)}
                      </span>
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
            {brokerRebates?.map((rebate) => (
              <div
                key={rebate.id}
                className="border border-border/30 rounded-none p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-medium">
                      {rebate.broker_uid}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rebate.exchange_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-medium text-sm">
                      ${rebate.total_rebate_amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rebate.currency}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("mobile.date")}
                    </span>
                    <div className="text-sm">
                      {new Date(rebate.date).toLocaleDateString()}
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
        {(!brokerRebates || brokerRebates.length === 0) && (
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
