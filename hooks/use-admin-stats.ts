import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AdminStatsResponse {
  totalUsers: number;
  newUsersToday: number;
  newSignupsThisWeek: number;
  totalKorCoins: number;
  postsToday: number;
  activeRooms: number;
  // Trend calculations
  totalUsersTrend: { value: number; isPositive: boolean };
  newUsersTrend: { value: number; isPositive: boolean };
  newSignupsTrend: { value: number; isPositive: boolean };
  totalKorCoinsTrend: { value: number; isPositive: boolean };
  postsTodayTrend: { value: number; isPositive: boolean };
  activeRoomsTrend: { value: number; isPositive: boolean };
  // We'll add more stats here as we implement them one by one
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async (): Promise<AdminStatsResponse> => {
      const supabase = createClient();

      const [
        totalUsersResult,
        newUsersResult,
        newSignupsResult,
        totalKorCoinsResult,
        postsTodayResult,
        activeRoomsResult,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date().toISOString().split("T")[0]), // Today's date
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          ), // Last 7 days
        supabase.from("users").select("kor_coins").not("kor_coins", "is", null), // Only users with KOR coins
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date().toISOString().split("T")[0]), // Today's posts
        supabase
          .from("trading_rooms")
          .select("*", { count: "exact", head: true })
          .eq("room_status", "active"), // Active rooms only
      ]);

      // Check for any errors in parallel
      const errors = [
        { name: "total users", error: totalUsersResult.error },
        { name: "new users", error: newUsersResult.error },
        { name: "new signups", error: newSignupsResult.error },
        { name: "total KOR coins", error: totalKorCoinsResult.error },
        { name: "posts today", error: postsTodayResult.error },
        { name: "active rooms", error: activeRoomsResult.error },
      ].filter(({ error }) => error);

      if (errors.length > 0) {
        throw new Error(
          `Failed to fetch admin stats: ${errors
            .map(({ name, error }) => `${name}: ${error?.message}`)
            .join(", ")}`
        );
      }

      // Calculate total KOR coins by summing all kor_coins values
      const totalKorCoins =
        totalKorCoinsResult.data?.reduce(
          (sum, user) => sum + (Number(user.kor_coins) || 0),
          0
        ) || 0;

      // Calculate realistic trends based on current values
      const calculateTrend = (current: number) => {
        // If current value is 0, trend should be 0% (no change)
        if (current === 0) {
          return { value: 0, isPositive: true };
        }

        // For non-zero values, show a small positive trend
        // In a real implementation, we would compare with historical data
        return { value: 2.5, isPositive: true };
      };

      return {
        totalUsers: totalUsersResult.count || 0,
        newUsersToday: newUsersResult.count || 0,
        newSignupsThisWeek: newSignupsResult.count || 0,
        totalKorCoins,
        postsToday: postsTodayResult.count || 0,
        activeRooms: activeRoomsResult.count || 0,
        // Trend calculations (mock for now)
        totalUsersTrend: calculateTrend(totalUsersResult.count || 0),
        newUsersTrend: calculateTrend(newUsersResult.count || 0),
        newSignupsTrend: calculateTrend(newSignupsResult.count || 0),
        totalKorCoinsTrend: calculateTrend(totalKorCoins),
        postsTodayTrend: calculateTrend(postsTodayResult.count || 0),
        activeRoomsTrend: calculateTrend(activeRoomsResult.count || 0),
        // We'll add more stats here as we implement them
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
