"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertTriangle, CheckCircle2, Eye } from "lucide-react";

interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  otherCount: number;
}

interface NotificationStatsProps {
  stats: NotificationStats;
}

export function NotificationStats({ stats }: NotificationStatsProps) {
  const statCards = [
    {
      title: "Total Notifications",
      value: stats.totalCount,
      description: "All notifications",
      icon: Bell,
      color: "text-blue-600",
    },
    {
      title: "Unread",
      value: stats.unreadCount,
      description: "Require attention",
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    {
      title: "Read",
      value: stats.readCount,
      description: "Already reviewed",
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      title: "Other",
      value: stats.otherCount,
      description: "Additional notifications",
      icon: Eye,
      color: "text-purple-600",
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
