import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ChartDataPoint {
  date: string;
  users: number;
  coins: number;
}

interface ChartDataResponse {
  userGrowth: ChartDataPoint[];
  korCoinsActivity: ChartDataPoint[];
}

export function useChartData() {
  return useQuery({
    queryKey: ["admin", "chart-data"],
    queryFn: async (): Promise<ChartDataResponse> => {
      const supabase = createClient();

      // Get the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Single query to get all users with their creation dates and KOR coins
      const { data: allUsers, error } = await supabase
        .from("users")
        .select("created_at, kor_coins")
        .gte("created_at", startDate.toISOString());

      if (error) {
        throw new Error(`Failed to fetch chart data: ${error.message}`);
      }

      // Initialize data structure for 30 days
      const chartData: ChartDataPoint[] = [];
      for (let i = 0; i < 30; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split("T")[0];

        chartData.push({
          date: dateStr,
          users: 0,
          coins: 0,
        });
      }

      // Process all users data efficiently
      allUsers?.forEach((user) => {
        const userDate = new Date(user.created_at);
        const dateStr = userDate.toISOString().split("T")[0];

        // Find the corresponding day in our chart data
        const dayIndex = chartData.findIndex((day) => day.date === dateStr);
        if (dayIndex !== -1) {
          chartData[dayIndex].users++;
          chartData[dayIndex].coins += Number(user.kor_coins) || 0;
        }
      });

      // Calculate cumulative values for user growth (total users up to each day)
      let cumulativeUsers = 0;
      const userGrowthData = chartData.map((day) => {
        cumulativeUsers += day.users;
        return {
          ...day,
          users: cumulativeUsers,
        };
      });

      // Calculate cumulative values for KOR coins (total coins up to each day)
      let cumulativeCoins = 0;
      const korCoinsData = chartData.map((day) => {
        cumulativeCoins += day.coins;
        return {
          ...day,
          coins: cumulativeCoins,
        };
      });

      return {
        userGrowth: userGrowthData,
        korCoinsActivity: korCoinsData,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
