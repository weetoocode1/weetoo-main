import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface OrangeXCommissionItem {
  myCommission?: string | number | null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the cron secret
    const cronSecret = request.headers.get("X-Cron-Secret");
    const expectedSecret = process.env.APP_CRON_SECRET;

    if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("OrangeX rebates sync started at:", new Date().toISOString());

    const supabase = await createClient();

    // Get all active OrangeX UIDs
    const { data: activeUids, error: uidsError } = await supabase
      .from("user_broker_uids")
      .select("id, user_id, exchange_id, uid, rebate_last_sync_at")
      .eq("exchange_id", "orangex")
      .eq("is_active", true);

    if (uidsError) {
      console.error("Error fetching active UIDs:", uidsError);
      return NextResponse.json(
        { error: "Failed to fetch UIDs" },
        { status: 500 }
      );
    }

    if (!activeUids || activeUids.length === 0) {
      console.log("No active OrangeX UIDs found");
      return NextResponse.json({
        success: true,
        message: "No active UIDs to process",
        processed: 0,
        updated: 0,
      });
    }

    console.log(`Found ${activeUids.length} active OrangeX UIDs`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process each UID
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

        let totalRebateAmount = 0;

        // Fetch Perpetual trading rebates
        try {
          const perpResponse = await fetch(
            `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/api/broker`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                broker: "orangex",
                action: "commission",
                uid: uidRecord.uid,
                sourceType: "PERPETUAL",
              }),
            }
          );

          if (perpResponse.ok) {
            const perpData = await perpResponse.json();
            if (perpData && !perpData.error && Array.isArray(perpData)) {
              const perpTotal = (perpData as OrangeXCommissionItem[]).reduce(
                (sum: number, item: OrangeXCommissionItem) => {
                  const raw = item.myCommission;
                  const value =
                    typeof raw === "number"
                      ? raw
                      : parseFloat((raw ?? "0") as string);
                  return sum + (Number.isFinite(value) ? value : 0);
                },
                0
              );
              totalRebateAmount += perpTotal;
              console.log(
                `UID ${uidRecord.uid} Perpetual rebates: $${perpTotal}`
              );
            }
          }
        } catch (error) {
          console.error(
            `Error fetching perpetual rebates for UID ${uidRecord.uid}:`,
            error
          );
        }

        // Fetch Copy Trading rebates
        try {
          const copyResponse = await fetch(
            `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/api/broker`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                broker: "orangex",
                action: "commission",
                uid: uidRecord.uid,
                sourceType: "CopyTrading",
              }),
            }
          );

          if (copyResponse.ok) {
            const copyData = await copyResponse.json();
            if (copyData && !copyData.error && Array.isArray(copyData)) {
              const copyTotal = (copyData as OrangeXCommissionItem[]).reduce(
                (sum: number, item: OrangeXCommissionItem) => {
                  const raw = item.myCommission;
                  const value =
                    typeof raw === "number"
                      ? raw
                      : parseFloat((raw ?? "0") as string);
                  return sum + (Number.isFinite(value) ? value : 0);
                },
                0
              );
              totalRebateAmount += copyTotal;
              console.log(
                `UID ${uidRecord.uid} Copy Trading rebates: $${copyTotal}`
              );
            }
          }
        } catch (error) {
          console.error(
            `Error fetching copy trading rebates for UID ${uidRecord.uid}:`,
            error
          );
        }

        // Fetch Spot trading rebates
        try {
          const spotResponse = await fetch(
            `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/api/broker`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                broker: "orangex",
                action: "spot-commission",
                uid: uidRecord.uid,
                sourceType: "SPOT",
              }),
            }
          );

          if (spotResponse.ok) {
            const spotData = await spotResponse.json();
            if (spotData && !spotData.error && Array.isArray(spotData)) {
              const spotTotal = (spotData as OrangeXCommissionItem[]).reduce(
                (sum: number, item: OrangeXCommissionItem) => {
                  const raw = item.myCommission;
                  const value =
                    typeof raw === "number"
                      ? raw
                      : parseFloat((raw ?? "0") as string);
                  return sum + (Number.isFinite(value) ? value : 0);
                },
                0
              );
              totalRebateAmount += spotTotal;
              console.log(`UID ${uidRecord.uid} Spot rebates: $${spotTotal}`);
            }
          }
        } catch (error) {
          console.error(
            `Error fetching spot rebates for UID ${uidRecord.uid}:`,
            error
          );
        }

        // Update the snapshot columns if we have rebates
        if (totalRebateAmount > 0) {
          // 1. Store in broker_rebates table
          const { error: brokerRebateError } = await supabase
            .from("broker_rebates")
            .upsert(
              {
                broker_uid: uidRecord.uid,
                exchange_id: uidRecord.exchange_id,
                date: new Date().toISOString().split("T")[0], // Today's date
                total_rebate_amount: totalRebateAmount,
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
              rebate_amount: totalRebateAmount,
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

          const { error: updateError } = await supabase
            .from("user_broker_uids")
            .update({
              rebate_last_day_usd: totalRebateAmount,
              rebate_balance_usd: currentBalance + totalRebateAmount,
              rebate_lifetime_usd: currentLifetime + totalRebateAmount,
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
              `Updated UID ${uidRecord.uid} with total rebate: $${totalRebateAmount}`
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

        // Small delay between requests to be respectful
        if (processed < activeUids.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing UID ${uidRecord.uid}:`, error);
        errors++;
      }
    }

    const result = {
      success: true,
      message: "OrangeX rebates sync completed",
      processed,
      updated,
      errors,
      totalUids: activeUids.length,
    };

    console.log("OrangeX rebates sync completed:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("OrangeX rebates sync failed:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
