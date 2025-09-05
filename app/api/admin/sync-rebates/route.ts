import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const syncRebatesSchema = z.object({
  exchange: z.enum(["deepcoin", "orangex", "all"]).optional().default("all"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      userError ||
      !userData ||
      !["admin", "super_admin"].includes(userData.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { exchange } = syncRebatesSchema.parse(body);

    const results = [];

    // Sync DeepCoin if requested
    if (exchange === "all" || exchange === "deepcoin") {
      try {
        const deepcoinResponse = await fetch(
          `${process.env.APP_BASE_URL}/api/cron/rebates/deepcoin`,
          {
            method: "POST",
            headers: {
              "X-Cron-Secret": process.env.APP_CRON_SECRET || "",
              "Content-Type": "application/json",
            },
          }
        );

        if (deepcoinResponse.ok) {
          const deepcoinData = await deepcoinResponse.json();
          results.push({
            exchange: "deepcoin",
            success: true,
            data: deepcoinData,
          });
        } else {
          const errorData = await deepcoinResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          console.error("DeepCoin sync failed:", errorData);
          results.push({
            exchange: "deepcoin",
            success: false,
            error: errorData.error || "Failed to sync DeepCoin",
          });
        }
      } catch (error) {
        results.push({
          exchange: "deepcoin",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Sync OrangeX if requested
    if (exchange === "all" || exchange === "orangex") {
      try {
        const orangexResponse = await fetch(
          `${process.env.APP_BASE_URL}/api/cron/rebates/orangex`,
          {
            method: "POST",
            headers: {
              "X-Cron-Secret": process.env.APP_CRON_SECRET || "",
              "Content-Type": "application/json",
            },
          }
        );

        if (orangexResponse.ok) {
          const orangexData = await orangexResponse.json();
          results.push({
            exchange: "orangex",
            success: true,
            data: orangexData,
          });
        } else {
          const errorData = await orangexResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          console.error("OrangeX sync failed:", errorData);
          results.push({
            exchange: "orangex",
            success: false,
            error: errorData.error || "Failed to sync OrangeX",
          });
        }
      } catch (error) {
        results.push({
          exchange: "orangex",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const allSuccessful = results.every((result) => result.success);

    return NextResponse.json({
      success: allSuccessful,
      results,
      message: allSuccessful
        ? "Rebates synced successfully"
        : "Some rebates failed to sync",
    });
  } catch (error) {
    console.error("Error syncing rebates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
