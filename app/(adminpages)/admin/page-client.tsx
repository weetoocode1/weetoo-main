"use client";

import { StatCard } from "@/components/admin/stat-card";
import { UserGrowthChart } from "@/components/admin/user-growth-chart";
import { KorCoinsChart } from "@/components/admin/kor-coins-chart";
import { RecentUsersTable } from "@/components/admin/recent-users-table";
import { RecentPostsTable } from "@/components/admin/recent-posts-table";
import { stats } from "@/components/admin/stats-data";
import { useAdminStats } from "@/hooks/use-admin-stats";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("admin.overview");
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

  // Translate stat labels/descriptions by matching known titles
  const translateStat = (title: string) => {
    switch (title) {
      case "Total Users":
        return {
          title: t("stats.totalUsers.title"),
          description: t("stats.totalUsers.description"),
          subDescription: t("stats.totalUsers.subDescription"),
        };
      case "New Users":
        return {
          title: t("stats.newUsers.title"),
          description: t("stats.newUsers.description"),
          subDescription: t("stats.newUsers.subDescription"),
        };
      case "New Signups":
        return {
          title: t("stats.newSignups.title"),
          description: t("stats.newSignups.description"),
          subDescription: t("stats.newSignups.subDescription"),
        };
      case "Total KOR Coins":
        return {
          title: t("stats.totalKorCoins.title"),
          description: t("stats.totalKorCoins.description"),
          subDescription: t("stats.totalKorCoins.subDescription"),
        };
      case "Posts Today":
        return {
          title: t("stats.postsToday.title"),
          description: t("stats.postsToday.description"),
          subDescription: t("stats.postsToday.subDescription"),
        };
      case "Active Rooms":
        return {
          title: t("stats.activeRooms.title"),
          description: t("stats.activeRooms.description"),
          subDescription: t("stats.activeRooms.subDescription"),
        };
      case "Deposits Pending":
        return {
          title: t("stats.depositsPending.title"),
          description: t("stats.depositsPending.description"),
          subDescription: t("stats.depositsPending.subDescription"),
        };
      case "Pending Reports":
        return {
          title: t("stats.pendingReports.title"),
          description: t("stats.pendingReports.description"),
          subDescription: t("stats.pendingReports.subDescription"),
        };
      default:
        return { title, description: "", subDescription: "" };
    }
  };

  return (
    <div className="space-y-3">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const { title, description, subDescription } = translateStat(
            stat.title
          );
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
                title={title}
                description={description || stat.description}
                subDescription={subDescription || stat.subDescription}
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

          return (
            <StatCard
              key={index}
              {...stat}
              title={title}
              description={description || stat.description}
              subDescription={subDescription || stat.subDescription}
            />
          );
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
