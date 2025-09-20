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

    // Fetch all ranking data in parallel
    const [
      winRateResult,
      profitRateResult,
      activityResult,
      donationResult,
      followersResult,
    ] = await Promise.allSettled([
      supabase
        .from("trader_rankings")
        .select("*")
        .order("win_rate", { ascending: false })
        .limit(10),
      supabase
        .from("trader_rankings")
        .select("*")
        .order("profit_rate", { ascending: false })
        .limit(10),
      supabase
        .from("users")
        .select("id, first_name, last_name, avatar_url, nickname, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("users")
        .select(
          "id, first_name, last_name, avatar_url, nickname, total_donations"
        )
        .order("total_donations", { ascending: false })
        .limit(10),
      supabase
        .from("users")
        .select(
          "id, first_name, last_name, avatar_url, nickname, followers_count"
        )
        .order("followers_count", { ascending: false })
        .limit(10),
    ]);

    return {
      returnRateData:
        winRateResult.status === "fulfilled" &&
        winRateResult.value.data &&
        winRateResult.value.data.length > 0
          ? winRateResult.value.data.map((trader, index) => ({
              ...trader,
              rank: index + 1,
            }))
          : [],
      virtualMoneyData:
        profitRateResult.status === "fulfilled" &&
        profitRateResult.value.data &&
        profitRateResult.value.data.length > 0
          ? profitRateResult.value.data.map((trader, index) => ({
              ...trader,
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
              total_exp: 0, // Default value since created_at doesn't represent experience
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
              total_donation: user.total_donations || 0,
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
              total_followers: user.followers_count || 0,
              rank: index + 1,
            }))
          : [],
    };
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
