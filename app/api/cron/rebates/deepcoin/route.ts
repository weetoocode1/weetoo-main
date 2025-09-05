import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Verify the cron secret
    const cronSecret = request.headers.get("X-Cron-Secret");
    const expectedSecret = process.env.APP_CRON_SECRET;

    if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("DeepCoin rebates sync started at:", new Date().toISOString());

    // Get yesterday's date in UTC+8 (DeepCoin's timezone)
    const now = new Date();
    const utc8Offset = 8 * 60; // UTC+8 in minutes
    const utc8Time = new Date(now.getTime() + utc8Offset * 60 * 1000);
    const yesterday = new Date(utc8Time);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD format

    console.log("Fetching DeepCoin rebates for date:", dateStr);

    const supabase = await createClient();

    // Get all active DeepCoin UIDs
    const { data: activeUids, error: uidsError } = await supabase
      .from("user_broker_uids")
      .select("id, user_id, exchange_id, uid, rebate_last_sync_at")
      .eq("exchange_id", "deepcoin")
      .eq("is_active", true);

    if (uidsError) {
      console.error("Error fetching active UIDs:", uidsError);
      return NextResponse.json(
        { error: "Failed to fetch UIDs" },
        { status: 500 }
      );
    }

    if (!activeUids || activeUids.length === 0) {
      console.log("No active DeepCoin UIDs found");
      return NextResponse.json({
        success: true,
        message: "No active UIDs to process",
        processed: 0,
        updated: 0,
      });
    }

    console.log(`Found ${activeUids.length} active DeepCoin UIDs`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process each UID with rate limiting (1 req/sec for DeepCoin)
    for (const uidRecord of activeUids) {
      try {
        // Skip if already synced today
        if (uidRecord.rebate_last_sync_at) {
          const lastSync = new Date(uidRecord.rebate_last_sync_at);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (lastSync >= today) {
            console.log(`Skipping UID ${uidRecord.uid} - already synced today`);
            continue;
          }
        }

        // Call DeepCoin API to get daily rebates
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/api/broker`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              broker: "deepcoin",
              action: "daily-rebates",
              uid: uidRecord.uid,
              date: dateStr,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            `Failed to fetch rebates for UID ${uidRecord.uid}:`,
            response.status
          );
          errors++;
          continue;
        }

        const data = await response.json();

        if (data.error) {
          console.error(`API error for UID ${uidRecord.uid}:`, data.error);
          errors++;
          continue;
        }

        // Extract rebate amount from response
        const rebateAmount = data.rebateAmount || data.totalCommission || 0;

        if (rebateAmount > 0) {
          // 1. Store in broker_rebates table
          const { error: brokerRebateError } = await supabase
            .from("broker_rebates")
            .upsert(
              {
                broker_uid: uidRecord.uid,
                exchange_id: uidRecord.exchange_id,
                date: dateStr,
                total_rebate_amount: rebateAmount,
                currency: "USDT",
              },
              {
                onConflict: "broker_uid,exchange_id,date",
              }
            );

          if (brokerRebateError) {
            console.error(
              `Failed to store broker rebate for UID ${uidRecord.uid}:`,
              brokerRebateError
            );
            errors++;
            continue;
          }

          // 2. Store in user_rebates table
          const { error: userRebateError } = await supabase
            .from("user_rebates")
            .insert({
              user_id: uidRecord.user_id,
              broker_uid: uidRecord.uid,
              exchange_id: uidRecord.exchange_id,
              rebate_amount: rebateAmount,
              status: "withdrawable",
            });

          if (userRebateError) {
            console.error(
              `Failed to store user rebate for UID ${uidRecord.uid}:`,
              userRebateError
            );
            errors++;
            continue;
          }

          // 3. Update user_broker_uids with new totals
          const { data: currentData, error: fetchError } = await supabase
            .from("user_broker_uids")
            .select("rebate_balance_usd, rebate_lifetime_usd")
            .eq("id", uidRecord.id)
            .single();

          if (fetchError) {
            console.error(
              `Failed to fetch current balance for UID ${uidRecord.uid}:`,
              fetchError
            );
            errors++;
            continue;
          }

          const currentBalance = currentData?.rebate_balance_usd || 0;
          const currentLifetime = currentData?.rebate_lifetime_usd || 0;

          // Update the snapshot columns
          const { error: updateError } = await supabase
            .from("user_broker_uids")
            .update({
              rebate_last_day_usd: rebateAmount,
              rebate_balance_usd: currentBalance + rebateAmount,
              rebate_lifetime_usd: currentLifetime + rebateAmount,
              rebate_last_sync_at: new Date().toISOString(),
            })
            .eq("id", uidRecord.id);

          if (updateError) {
            console.error(
              `Failed to update UID ${uidRecord.uid}:`,
              updateError
            );
            errors++;
          } else {
            console.log(
              `Updated UID ${uidRecord.uid} with rebate: $${rebateAmount}`
            );
            updated++;
          }
        } else {
          // Still update sync time even if no rebates
          await supabase
            .from("user_broker_uids")
            .update({
              rebate_last_sync_at: new Date().toISOString(),
            })
            .eq("id", uidRecord.id);
        }

        processed++;

        // Rate limiting: wait 1 second between requests (DeepCoin limit)
        if (processed < activeUids.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing UID ${uidRecord.uid}:`, error);
        errors++;
      }
    }

    const result = {
      success: true,
      message: "DeepCoin rebates sync completed",
      date: dateStr,
      processed,
      updated,
      errors,
      totalUids: activeUids.length,
    };

    console.log("DeepCoin rebates sync completed:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("DeepCoin rebates sync failed:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
