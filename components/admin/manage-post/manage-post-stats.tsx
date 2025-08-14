"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, FileText, Heart } from "lucide-react";

export function ManagePostStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "post-stats"],
    queryFn: async () => {
      const supabase = createClient();

      // Single optimized query to get all stats
      const { data: allPosts, error } = await supabase
        .from("posts")
        .select("created_at, views, likes, comments");

      if (error) throw error;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalPosts = allPosts?.length || 0;
      const totalViews =
        allPosts?.reduce((sum, post) => sum + (post.views || 0), 0) || 0;
      const totalLikes =
        allPosts?.reduce((sum, post) => sum + (post.likes || 0), 0) || 0;
      const totalComments =
        allPosts?.reduce((sum, post) => sum + (post.comments || 0), 0) || 0;

      const postsToday =
        allPosts?.filter((post) => new Date(post.created_at) >= today).length ||
        0;
      const postsThisWeek =
        allPosts?.filter((post) => new Date(post.created_at) >= weekAgo)
          .length || 0;
      const postsThisMonth =
        allPosts?.filter((post) => new Date(post.created_at) >= monthAgo)
          .length || 0;

      return {
        totalPosts: totalPosts || 0,
        totalViews: totalViews || 0,
        totalLikes: totalLikes || 0,
        totalComments: totalComments || 0,
        postsToday: postsToday || 0,
        postsThisWeek: postsThisWeek || 0,
        postsThisMonth: postsThisMonth || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
      title: "Total Posts",
      value: stats?.totalPosts || 0,
      icon: FileText,
      description: "All posts across boards",
      color: "text-blue-600",
    },
    {
      title: "Total Views",
      value: stats?.totalViews || 0,
      icon: Eye,
      description: "Combined post views",
      color: "text-green-600",
    },
    {
      title: "Total Likes",
      value: stats?.totalLikes || 0,
      icon: Heart,
      description: "Combined post likes",
      color: "text-red-600",
    },
    {
      title: "Posts Today",
      value: stats?.postsToday || 0,
      icon: Calendar,
      description: "New posts today",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title} className="relative">
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
                <div className="text-2xl font-bold">
                  {stat.value.toLocaleString()}
                </div>
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
