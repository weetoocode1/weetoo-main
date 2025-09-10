import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Parallel data fetching for better performance
    const [
      winRateResult,
      profitRateResult,
      activityResult,
      donationResult,
      followersResult,
    ] = await Promise.allSettled([
      supabase
        .from("weekly_trader_leaderboard")
        .select("*")
        .order("win_rate", { ascending: false })
        .limit(10),
      supabase
        .from("weekly_trader_leaderboard")
        .select("*")
        .order("total_return", { ascending: false })
        .limit(10),
      supabase
        .from("weekly_exp_leaderboard")
        .select("*")
        .order("total_exp", { ascending: false })
        .limit(10),
      supabase
        .from("weekly_donation_leaderboard")
        .select("*")
        .order("total_donation", { ascending: false })
        .limit(10),
      supabase
        .from("weekly_followers_leaderboard")
        .select("*")
        .order("total_followers", { ascending: false })
        .limit(10),
    ]);

    const data = {
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
              ...user,
              rank: index + 1,
            }))
          : [],
      donationData:
        donationResult.status === "fulfilled" &&
        donationResult.value.data &&
        donationResult.value.data.length > 0
          ? donationResult.value.data.map((user, index) => ({
              ...user,
              rank: index + 1,
            }))
          : [],
      followersData:
        followersResult.status === "fulfilled" &&
        followersResult.value.data &&
        followersResult.value.data.length > 0
          ? followersResult.value.data.map((user, index) => ({
              ...user,
              rank: index + 1,
            }))
          : [],
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching rankings data:", error);
    return NextResponse.json(
      {
        returnRateData: [],
        virtualMoneyData: [],
        activityData: [],
        donationData: [],
        followersData: [],
      },
      { status: 500 }
    );
  }
}
