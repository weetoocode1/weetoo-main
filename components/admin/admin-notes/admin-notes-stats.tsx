"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, FileText, Clock, TrendingUp } from "lucide-react";

interface AdminNotesStats {
  totalNotes: number;
  highPriorityNotes: number;
  notesThisWeek: number;
  notesThisMonth: number;
}

export function AdminNotesStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-notes-stats"],
    queryFn: async (): Promise<AdminNotesStats> => {
      const supabase = createClient();

      // Get total notes count
      const { count: totalNotes } = await supabase
        .from("admin_notes")
        .select("*", { count: "exact", head: true });

      // Get high priority notes count
      const { count: highPriorityNotes } = await supabase
        .from("admin_notes")
        .select("*", { count: "exact", head: true })
        .eq("priority", "High");

      // Get notes from this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: notesThisWeek } = await supabase
        .from("admin_notes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Get notes from this month
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const { count: notesThisMonth } = await supabase
        .from("admin_notes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthAgo.toISOString());

      return {
        totalNotes: totalNotes || 0,
        highPriorityNotes: highPriorityNotes || 0,
        notesThisWeek: notesThisWeek || 0,
        notesThisMonth: notesThisMonth || 0,
      };
    },
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 30000, // Refetch every 30 seconds for real-time feel
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative">
            <Card className="border border-border rounded-none shadow-none">
              {/* Corner borders for skeleton */}
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
      title: "Total Notes",
      value: stats?.totalNotes || 0,
      icon: FileText,
      description: "All admin notes",
      color: "text-blue-600",
    },
    {
      title: "High Priority",
      value: stats?.highPriorityNotes || 0,
      icon: AlertTriangle,
      description: "High priority notes",
      color: "text-red-600",
    },
    {
      title: "This Week",
      value: stats?.notesThisWeek || 0,
      icon: Clock,
      description: "Notes created this week",
      color: "text-green-600",
    },
    {
      title: "This Month",
      value: stats?.notesThisMonth || 0,
      icon: TrendingUp,
      description: "Notes created this month",
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
  );
}
