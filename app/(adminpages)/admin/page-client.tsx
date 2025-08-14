"use client";

import { StatCard } from "@/components/admin/stat-card";
import { UserGrowthChart } from "@/components/admin/user-growth-chart";
import { KorCoinsChart } from "@/components/admin/kor-coins-chart";
import { RecentUsersTable } from "@/components/admin/recent-users-table";
import { RecentPostsTable } from "@/components/admin/recent-posts-table";
import { stats } from "@/components/admin/stats-data";
import { useAdminStats } from "@/hooks/use-admin-stats";

// Import the type from the hook file
type AdminStatsResponse = {
  totalUsers: number;
  newUsersToday: number;
  newSignupsThisWeek: number;
  totalKorCoins: number;
  postsToday: number;
  activeRooms: number;
  totalUsersTrend: { value: number; isPositive: boolean };
  newUsersTrend: { value: number; isPositive: boolean };
  newSignupsTrend: { value: number; isPositive: boolean };
  totalKorCoinsTrend: { value: number; isPositive: boolean };
  postsTodayTrend: { value: number; isPositive: boolean };
  activeRoomsTrend: { value: number; isPositive: boolean };
};

export function AdminClient() {
  const { data: adminStats, isLoading: isStatsLoading } = useAdminStats();

  // Mapping object for real data stats
  const realDataMapping: Record<string, keyof AdminStatsResponse> = {
    "Total Users": "totalUsers",
    "New Users": "newUsersToday",
    "New Signups": "newSignupsThisWeek",
    "Total KOR Coins": "totalKorCoins",
    "Posts Today": "postsToday",
    "Active Rooms": "activeRooms",
  } as const;

  return (
    <div className="space-y-3">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          // Check if this stat needs real data
          if (stat.isRealData && realDataMapping[stat.title]) {
            const dataKey = realDataMapping[
              stat.title
            ] as keyof AdminStatsResponse;

            // Get the corresponding trend key
            const trendKey = `${dataKey}Trend` as keyof AdminStatsResponse;

            return (
              <StatCard
                key={index}
                {...stat}
                value={
                  isStatsLoading ? 0 : (adminStats?.[dataKey] as number) || 0
                }
                trend={
                  isStatsLoading
                    ? stat.trend
                    : (adminStats?.[trendKey] as unknown as {
                        value: number;
                        isPositive: boolean;
                      }) || stat.trend
                }
                isLoading={isStatsLoading}
              />
            );
          }

          return <StatCard key={index} {...stat} />;
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <UserGrowthChart />
        <KorCoinsChart />
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RecentUsersTable />
        <RecentPostsTable />
      </div>
    </div>
  );
}
