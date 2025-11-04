import { createClient } from "@/lib/supabase/server";

// Types for real data from Supabase
interface TraderData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_return: number;
  portfolio_value: number;
  win_rate?: number;
  rank?: number;
}

interface ActivityData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_exp: number;
  rank?: number;
}

interface DonationData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_donation: number;
  rank?: number;
}

interface FollowersData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  total_followers: number;
  rank?: number;
}

// Data structure type
export interface RankingsData {
  returnRateData: TraderData[];
  virtualMoneyData: TraderData[];
  activityData: ActivityData[];
  donationData: DonationData[];
  followersData: FollowersData[];
}

// Server-side data fetching function
export async function getRankingsData(): Promise<RankingsData> {
  try {
    // Direct database access instead of API call during build
    const supabase = await createClient();

    // Fetch all ranking data in parallel using the same weekly views as individual components
    const [
      winRateResult,
      profitRateResult,
      activityResult,
      donationResult,
      followersResult,
    ] = await Promise.allSettled([
      // Use weekly trader leaderboard for win rate (same as trader-ranking.tsx)
      supabase.from("weekly_trader_leaderboard").select("*").limit(10),
      // Use weekly profit leaderboard for profit rate (same as profit-ranking.tsx)
      supabase.from("weekly_profit_leaderboard").select("*").limit(10),
      // Use weekly exp leaderboard for activity (same as most-activity-ranking.tsx)
      supabase
        .from("weekly_exp_leaderboard")
        .select("*")
        .order("total_exp", { ascending: false })
        .limit(10),
      // Use weekly donation leaderboard for sponsored (same as sponsored-ranking.tsx)
      supabase
        .from("weekly_donation_leaderboard")
        .select("*")
        .order("total_donation", { ascending: false })
        .limit(10),
      // Use weekly followers leaderboard for followers (same as most-followed-ranking.tsx)
      supabase
        .from("weekly_followers_leaderboard")
        .select("*")
        .order("total_followers", { ascending: false })
        .limit(10),
    ]);

    const result = {
      returnRateData:
        winRateResult.status === "fulfilled" &&
        winRateResult.value.data &&
        winRateResult.value.data.length > 0
          ? winRateResult.value.data.map((trader, index) => ({
              id: trader.id,
              nickname: trader.nickname,
              avatar_url: trader.avatar_url,
              total_return: trader.total_return || 0,
              portfolio_value: trader.portfolio_value || 0,
              win_rate: trader.win_rate || 0,
              rank: index + 1,
            }))
          : [],
      virtualMoneyData:
        profitRateResult.status === "fulfilled" &&
        profitRateResult.value.data &&
        profitRateResult.value.data.length > 0
          ? profitRateResult.value.data.map((trader, index) => ({
              id: trader.id,
              nickname: trader.nickname,
              avatar_url: trader.avatar_url,
              total_return: trader.total_return || 0,
              portfolio_value: trader.portfolio_value || 0,
              win_rate: trader.win_rate || 0,
              rank: index + 1,
            }))
          : [],
      activityData:
        activityResult.status === "fulfilled" &&
        activityResult.value.data &&
        activityResult.value.data.length > 0
          ? activityResult.value.data.map((user, index) => ({
              id: user.id,
              nickname: user.nickname,
              avatar_url: user.avatar_url,
              total_exp: user.total_exp || 0,
              rank: index + 1,
            }))
          : [],
      donationData:
        donationResult.status === "fulfilled" &&
        donationResult.value.data &&
        donationResult.value.data.length > 0
          ? donationResult.value.data.map((user, index) => ({
              id: user.id,
              nickname: user.nickname,
              avatar_url: user.avatar_url,
              total_donation: user.total_donation || 0,
              rank: index + 1,
            }))
          : [],
      followersData:
        followersResult.status === "fulfilled" &&
        followersResult.value.data &&
        followersResult.value.data.length > 0
          ? followersResult.value.data.map((user, index) => ({
              id: user.id,
              nickname: user.nickname,
              avatar_url: user.avatar_url,
              total_followers: user.total_followers || 0,
              rank: index + 1,
            }))
          : [],
    };

    // Debug: Log the result to understand what data is being returned
    // console.log("getRankingsData result:", {
    //   returnRateData: result.returnRateData.length,
    //   virtualMoneyData: result.virtualMoneyData.length,
    //   activityData: result.activityData.length,
    //   donationData: result.donationData.length,
    //   followersData: result.followersData.length,
    // });

    return result;
  } catch (error) {
    console.error("Error fetching rankings data:", error);
    return {
      returnRateData: [],
      virtualMoneyData: [],
      activityData: [],
      donationData: [],
      followersData: [],
    };
  }
}
