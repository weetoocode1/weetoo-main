"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAdminWithdrawalRealtimeSubscriptions,
  useWithdrawalStats,
} from "@/hooks/use-withdrawal";
import { AlertTriangle, CreditCard, Shield } from "lucide-react";
import { WithdrawTable } from "./withdraw-table";

export function WithdrawManagementPage() {
  useAdminWithdrawalRealtimeSubscriptions();
  const { data: stats } = useWithdrawalStats();
  const total = stats?.totalRequests || 0;
  const pendingVerification = stats?.pendingRequests || 0; // includes pending + verification_sent in hook logic
  const verified = stats?.verifiedRequests || 0;
  const completed = stats?.completedRequests || 0;
  const rejected = Math.max(
    0,
    total - (pendingVerification + verified + completed)
  );

  const statCards = [
    {
      title: "Total Withdrawals",
      value: total.toLocaleString(),
      description: "All withdrawal requests",
      icon: CreditCard,
      color: "text-blue-600",
    },
    {
      title: "Pending Verification",
      value: pendingVerification.toLocaleString(),
      description: "Awaiting account verification",
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    {
      title: "Verified Accounts",
      value: verified.toLocaleString(),
      description: "Successfully verified accounts",
      icon: Shield,
      color: "text-green-600",
    },
    {
      title: "Rejected Withdrawals",
      value: rejected.toLocaleString(),
      description: "Failed or rejected",
      icon: AlertTriangle,
      color: "text-red-600",
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

      {/* Export CSV moved to table toolbar */}

      {/* Withdrawals Table */}
      <WithdrawTable />
    </div>
  );
}
