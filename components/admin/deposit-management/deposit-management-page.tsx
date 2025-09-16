"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CreditCard, Shield, TrendingUp } from "lucide-react";
import { DepositTable } from "./deposit-table";
import {
  useDepositStats,
  useAdminDepositRealtimeSubscriptions,
} from "@/hooks/use-deposit";
import { useTranslations } from "next-intl";

export function DepositManagementPage() {
  const t = useTranslations("admin.depositManagement.stats");
  useAdminDepositRealtimeSubscriptions();
  const { data: stats } = useDepositStats();

  const total = stats?.totalRequests || 0;
  const pendingVerification =
    (stats?.pendingRequests || 0) + (stats?.verificationSentRequests || 0);
  const verified =
    (stats?.verifiedRequests || 0) + (stats?.approvedRequests || 0);
  const completed = stats?.completedRequests || 0;

  const statCards = [
    {
      title: t("totalDeposits.title"),
      value: total.toLocaleString(),
      description: t("totalDeposits.description"),
      icon: CreditCard,
      color: "text-blue-600",
    },
    {
      title: t("pendingVerification.title"),
      value: pendingVerification.toLocaleString(),
      description: t("pendingVerification.description"),
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    {
      title: t("verifiedAccounts.title"),
      value: verified.toLocaleString(),
      description: t("verifiedAccounts.description"),
      icon: Shield,
      color: "text-green-600",
    },
    {
      title: t("completedDeposits.title"),
      value: completed.toLocaleString(),
      description: t("completedDeposits.description"),
      icon: TrendingUp,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
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

      {/* Deposits Table */}
      <DepositTable />
    </div>
  );
}
