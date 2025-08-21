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

      // Get the last 30 days INCLUDING today
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29); // 29 days back + today = 30 days

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

      // Get all users with their creation dates and current KOR coins
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("created_at, kor_coins");

      if (usersError) {
        throw new Error(`Failed to fetch users data: ${usersError.message}`);
      }

      // Get KOR coins adjustment history from database
      // TODO: Replace this with real database queries when tables are created
      // Current approach: localStorage stores adjustment history temporarily
      // Better approach: Query kor_coins_transactions table
      let adjustments: any[] = [];

      // TODO: When database is ready, replace this with:
      // const { data: transactions } = await supabase
      //   .from('kor_coins_transactions')
      //   .select('*')
      //   .gte('created_at', startDate.toISOString())
      //   .order('created_at', { ascending: true });

      try {
        if (typeof window !== "undefined") {
          const storedAdjustments = localStorage.getItem("korCoinsAdjustments");
          if (storedAdjustments) {
            adjustments = JSON.parse(storedAdjustments);
          }
        }
      } catch (error) {
        console.warn("Failed to parse KOR coins adjustments:", error);
      }

      // Process user creation data for user growth chart
      allUsers?.forEach((user) => {
        const userDate = new Date(user.created_at);
        const dateStr = userDate.toISOString().split("T")[0];

        // Find the corresponding day in our chart data
        const dayIndex = chartData.findIndex((day) => day.date === dateStr);
        if (dayIndex !== -1) {
          chartData[dayIndex].users++;
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

      // For KOR coins activity, show monthly coin usage/activity
      // This will show total monthly activity instead of daily spikes
      const korCoinsData = chartData.map((day) => {
        // Find adjustments for this specific day
        const dayAdjustments = adjustments.filter((adjustment) => {
          const adjustmentDate = new Date(adjustment.timestamp);
          const adjustmentDateStr = adjustmentDate.toISOString().split("T")[0];
          return adjustmentDateStr === day.date;
        });

        // Calculate total coins activity for this day
        let dailyActivity = 0;
        dayAdjustments.forEach((adjustment) => {
          if (adjustment.action === "add") {
            dailyActivity += adjustment.amount;
          } else if (adjustment.action === "subtract") {
            dailyActivity += adjustment.amount; // Show as positive for visibility
          }
        });

        // TODO: When database is ready, this will handle all transaction types:
        // - admin_adjustment: Admin manually adds/subtracts
        // - user_recharge: User pays money to get coins
        // - system_deduction: System automatically deducts for services
        // - refund: Refund for cancelled services
        // - bonus: Promotional bonus coins
        // - transfer: Transfer between users

        // For monthly view, we'll show the cumulative activity up to this day
        // This gives a better monthly trend view
        return {
          ...day,
          coins: dailyActivity,
        };
      });

      // Convert daily data to monthly cumulative data
      let cumulativeMonthlyActivity = 0;
      const monthlyKorCoinsData = korCoinsData.map((day) => {
        cumulativeMonthlyActivity += day.coins;
        return {
          ...day,
          coins: cumulativeMonthlyActivity,
        };
      });

      return {
        userGrowth: userGrowthData,
        korCoinsActivity: monthlyKorCoinsData,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
