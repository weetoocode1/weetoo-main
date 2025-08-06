"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDummyUsers, type DummyUser } from "@/lib/dummy-users";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Award, Medal, Minus, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

type TimeFrame = "daily" | "weekly" | "monthly";

const rankIcons = { 1: Trophy, 2: Medal, 3: Award };
const rankStyles = {
  1: {
    gradient: "from-yellow-400 via-yellow-500 to-yellow-600",
    border: "border-yellow-500/40",
    shadow: "shadow-[0_0_40px_rgba(234,179,8,0.25)]",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    icon: "text-yellow-400",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]",
  },
  2: {
    gradient: "from-slate-300 via-slate-400 to-slate-500",
    border: "border-slate-400/40",
    shadow: "shadow-[0_0_35px_rgba(148,163,184,0.2)]",
    badge: "bg-slate-500/20 text-slate-300 border-slate-400/40",
    icon: "text-slate-400",
    glow: "shadow-[0_0_15px_rgba(148,163,184,0.25)]",
  },
  3: {
    gradient: "from-amber-600 via-amber-700 to-amber-800",
    border: "border-amber-600/40",
    shadow: "shadow-[0_0_35px_rgba(217,119,6,0.2)]",
    badge: "bg-amber-600/20 text-amber-300 border-amber-600/40",
    icon: "text-amber-500",
    glow: "shadow-[0_0_15px_rgba(217,119,6,0.25)]",
  },
};

export function MostActivityRanking() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>("daily");
  const [users, setUsers] = useState<DummyUser[]>([]);
  const [, setLoading] = useState(true);
  const [, setUseDummyData] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const supabase = createClient();
    let viewName = "";
    if (selectedTimeFrame === "daily") viewName = "daily_exp_leaderboard";
    else if (selectedTimeFrame === "weekly")
      viewName = "weekly_exp_leaderboard";
    else viewName = "monthly_exp_leaderboard";

    const { data, error } = await supabase
      .from(viewName)
      .select("*")
      .order("total_exp", { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      // Use dummy data if no real data or error
      const dummyUsers = getDummyUsers(selectedTimeFrame);
      setUsers(dummyUsers);
      setUseDummyData(true);
    } else {
      // Use real data
      const ranked = data.map((user, idx) => ({
        ...user,
        rank: idx + 1,
      }));
      setUsers(ranked);
      setUseDummyData(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTimeFrame]);

  // Real-time subscription for user_activity_log changes
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to changes in user_activity_log table
    const channel = supabase
      .channel("user_activity_log_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "user_activity_log",
        },
        (payload) => {
          // console.log("Activity log change detected:", payload);
          // Refetch data when activity log changes
          fetchLeaderboard();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTimeFrame]); // Re-subscribe when timeFrame changes

  const topUsers = users.slice(0, 3);
  const tableData = users;

  return (
    <div className="w-full p-6 container mx-auto">
      {/* Time Frame Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="bg-muted/30 rounded-lg p-1 backdrop-blur-sm border border-border/50 ml-auto">
          {(["daily", "weekly", "monthly"] as TimeFrame[]).map((timeFrame) => (
            <button
              key={timeFrame}
              onClick={() => setSelectedTimeFrame(timeFrame)}
              className={cn(
                "px-3 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
                selectedTimeFrame === timeFrame
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Demo Notice */}
      {/* {useDummyData && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-600 text-sm font-medium">
            📊 Showing demo data - No real users found in the database
          </p>
        </div>
      )} */}

      {/* Top 3 Cards */}
      <div className="max-w-6xl mx-auto py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topUsers.map((user) => {
            const RankIcon = rankIcons[user.rank as keyof typeof rankIcons];
            const style = rankStyles[user.rank as keyof typeof rankStyles];
            return (
              <div key={user.id} className="relative group">
                {/* Gradient border wrapper */}
                <div
                  className={cn(
                    "p-[2px] rounded-2xl bg-gradient-to-br",
                    style.gradient
                  )}
                >
                  <Card
                    className={cn(
                      "relative overflow-hidden transition-all duration-500 cursor-pointer bg-background/95 backdrop-blur-sm border-0 rounded-2xl",
                      style.shadow,
                      hoveredCard === user.id && "scale-[1.03]",
                      "hover:shadow-2xl"
                    )}
                    onMouseEnter={() => setHoveredCard(user.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Background gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
                    <div className="absolute inset-0 bg-gradient-to-tl from-white/5 via-transparent to-black/5" />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Hover border effect */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-2xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                        style.border
                      )}
                    />

                    {/* Rank indicator */}
                    <div className="absolute top-5 right-5 z-20">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center bg-background/90 backdrop-blur-sm border-2",
                          style.border,
                          style.glow
                        )}
                      >
                        <RankIcon className={cn("w-5 h-5", style.icon)} />
                      </div>
                    </div>

                    <CardHeader className="text-center pb-6 pt-8">
                      {/* Avatar */}
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          <div
                            className={cn(
                              "absolute inset-0 rounded-full blur-xl opacity-30",
                              style.glow
                            )}
                          />
                          <Avatar className="w-20 h-20 ring-3 ring-background/80 shadow-xl relative z-10">
                            <AvatarImage
                              src={user.avatar_url}
                              alt={user.nickname}
                            />
                            <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                              {user.nickname?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      {/* User info */}
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-foreground">
                          {user.nickname}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold px-3 py-1.5",
                            style.badge
                          )}
                        >
                          Level {user.level}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="text-center pt-0">
                      <div className="space-y-5">
                        {/* Experience */}
                        <div className="relative overflow-hidden rounded-xl p-6 border border-border backdrop-blur-sm">
                          {/* Background gradients */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                          <div className="absolute inset-0 bg-gradient-to-tl from-white/10 via-transparent to-black/5" />

                          {/* Top accent line */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/40 to-transparent" />

                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                                Total Experience
                              </p>
                              <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                            </div>

                            <p className="text-3xl font-bold text-foreground mb-4">
                              {user.total_exp?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="mt-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">
              Full Leaderboard
            </h2>
            <p className="text-muted-foreground">
              Complete ranking of all active users •{" "}
              {selectedTimeFrame.charAt(0).toUpperCase() +
                selectedTimeFrame.slice(1)}{" "}
              Rankings
            </p>
          </div>

          {/* Time Frame Tabs */}
          <div className="bg-muted/30 rounded-lg p-1 backdrop-blur-sm border border-border/50">
            {(["daily", "weekly", "monthly"] as TimeFrame[]).map(
              (timeFrame) => (
                <button
                  key={timeFrame}
                  onClick={() => setSelectedTimeFrame(timeFrame)}
                  className={cn(
                    "px-3 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
                    selectedTimeFrame === timeFrame
                      ? "bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="bg-background/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden shadow-xl">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-5 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 border-b border-border/50 font-semibold text-sm text-muted-foreground">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">User</div>
            <div className="col-span-2">Level</div>
            <div className="col-span-3">Experience</div>
            <div className="col-span-2">Change</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border/50">
            {tableData.map((user, index) => {
              const isTop3 = (user.rank || 0) <= 3;
              const rankStyle = isTop3
                ? rankStyles[user.rank as keyof typeof rankStyles]
                : null;

              return (
                <div
                  key={user.id}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-6 py-5 hover:bg-muted/20 transition-all duration-300 group relative",
                    isTop3 &&
                      "bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20"
                  )}
                >
                  {/* Background glow for top 3 */}
                  {isTop3 && (
                    <div
                      className={cn(
                        "absolute inset-0 opacity-20",
                        rankStyle?.shadow
                      )}
                    />
                  )}

                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    {isTop3 ? (
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 shadow-lg",
                          rankStyle?.border,
                          rankStyle?.badge
                        )}
                      >
                        {user.rank === 1 ? (
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        ) : user.rank === 2 ? (
                          <Medal className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Award className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-sm font-bold text-foreground">
                        {user.rank}
                      </div>
                    )}
                  </div>

                  {/* User */}
                  <div className="col-span-4 flex items-center gap-4">
                    <Avatar
                      className={cn(
                        "ring-2 ring-border/30",
                        isTop3 ? "w-12 h-12" : "w-10 h-10"
                      )}
                    >
                      <AvatarImage src={user.avatar_url} alt={user.nickname} />
                      <AvatarFallback
                        className={cn(
                          "font-semibold",
                          isTop3 ? "text-base" : "text-sm",
                          isTop3
                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                            : "bg-muted/60"
                        )}
                      >
                        {user.nickname?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={cn(
                          "font-semibold text-foreground",
                          isTop3 ? "text-base" : "text-sm"
                        )}
                      >
                        {user.nickname}
                      </div>
                      {isTop3 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Top Performer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Level */}
                  <div className="col-span-2 flex items-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        isTop3 && rankStyle?.badge
                      )}
                    >
                      Level {user.level}
                    </Badge>
                  </div>

                  {/* Experience */}
                  <div className="col-span-3 flex items-center">
                    <div
                      className={cn(
                        "font-semibold text-foreground",
                        isTop3 ? "text-base" : "text-sm"
                      )}
                    >
                      {user.total_exp?.toLocaleString()}
                    </div>
                  </div>

                  {/* Change */}
                  <div className="col-span-2 flex items-center">
                    {/* Placeholder for change, as we don't have change data in the view */}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Minus className="w-3 h-3" />
                      <span className="text-xs font-medium">0</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
