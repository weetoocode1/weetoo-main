"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { RebateStats } from "@/components/admin/rebate-management/rebate-stats";
import { WithdrawalRequestsTable } from "@/components/admin/rebate-management/withdrawal-requests-table";
import { BrokerRebatesTable } from "@/components/admin/rebate-management/broker-rebates-table";
import { UserRebatesTable } from "@/components/admin/rebate-management/user-rebates-table";

export default function RebateManagementClient() {
  const t = useTranslations("admin.rebateManagement.page");
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSyncRebates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/sync-rebates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ exchange: "all" }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(t("messages.rebatesSynced"));
        // Invalidate and refetch all rebate-related queries
        await queryClient.invalidateQueries({
          queryKey: ["admin", "rebate-stats"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "withdrawal-requests"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "broker-rebates"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "user-rebates"],
        });
        await queryClient.invalidateQueries({ queryKey: ["user", "uids"] });
        await queryClient.invalidateQueries({
          queryKey: ["broker-rebate-withdrawals"],
        });
      } else {
        toast.error(data.message || t("messages.rebatesSyncFailed"));
      }
    } catch (error) {
      console.error("Error syncing rebates:", error);
      toast.error(t("messages.syncError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWithdrawals = async () => {
    try {
      const response = await fetch("/api/admin/export-withdrawals");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `withdrawals-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t("messages.withdrawalsExported"));
      } else {
        toast.error(t("messages.withdrawalsExportFailed"));
      }
    } catch (error) {
      console.error("Error exporting withdrawals:", error);
      toast.error(t("messages.exportError"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <RebateStats />

      {/* Tabs with Action Buttons */}
      <div className="flex items-center justify-between">
        <Tabs defaultValue="withdrawals" className="w-full">
          <TabsList className="rounded-none bg-muted/30 p-0 h-10 inline-flex">
            <TabsTrigger
              value="withdrawals"
              className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-200 hover:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground h-10 px-4"
            >
              {t("tabs.withdrawalRequests")}
            </TabsTrigger>
            <TabsTrigger
              value="broker-rebates"
              className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-200 hover:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground h-10 px-4"
            >
              {t("tabs.brokerRebates")}
            </TabsTrigger>
            <TabsTrigger
              value="user-rebates"
              className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-200 hover:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground h-10 px-4"
            >
              {t("tabs.userRebates")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 ml-4">
          <Button
            onClick={handleSyncRebates}
            disabled={isLoading}
            variant="outline"
            className="rounded-none h-9"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {t("actions.syncRebates")}
          </Button>
          <Button
            onClick={handleExportWithdrawals}
            className="rounded-none h-9"
          >
            <Download className="w-4 h-4 mr-2" />
            {t("actions.exportWithdrawals")}
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList className="hidden">
          <TabsTrigger value="withdrawals">
            {t("tabs.withdrawalRequests")}
          </TabsTrigger>
          <TabsTrigger value="broker-rebates">
            {t("tabs.brokerRebates")}
          </TabsTrigger>
          <TabsTrigger value="user-rebates">
            {t("tabs.userRebates")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="space-y-4">
          <WithdrawalRequestsTable />
        </TabsContent>

        <TabsContent value="broker-rebates" className="space-y-4">
          <BrokerRebatesTable />
        </TabsContent>

        <TabsContent value="user-rebates" className="space-y-4">
          <UserRebatesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
