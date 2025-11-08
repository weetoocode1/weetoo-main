import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

// Validation schema for withdrawal requests
const createWithdrawalSchema = z.object({
  user_broker_uid_id: z.string().uuid(),
  amount_usd: z.number().min(50, "Minimum withdrawal amount is $50"),
});

// GET: Fetch user's withdrawal history
export async function GET() {
  try {
    const { supabase } = await requireSessionUserId();

    const { data, error } = await supabase
      .from("broker_rebate_withdrawals")
      .select(
        `
        id,
        amount_usd,
        currency,
        status,
        exchange_id,
        broker_uid,
        user_broker_uid_id,
        processed_at,
        admin_notes,
        created_at,
        updated_at,
        user_broker_uids!inner(
          exchange_id,
          uid
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      // If table doesn't exist, return empty array instead of error
      if (
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        return NextResponse.json({ withdrawals: [] });
      }
      throw error;
    }

    return NextResponse.json({ withdrawals: data || [] });
  } catch (e: unknown) {
    console.error("API error:", e);
    const message = e instanceof Error ? e.message : "unknown";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json(
      {
        error: "Failed to load withdrawals",
        details: message,
      },
      { status }
    );
  }
}

// POST: Create new withdrawal request
export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await requireSessionUserId();
    const body = await request.json();

    // Validate request body
    const validatedData = createWithdrawalSchema.parse(body);
    const { user_broker_uid_id, amount_usd } = validatedData;

    // First, verify the UID belongs to the user and get broker details
    const { data: uidData, error: uidError } = await supabase
      .from("user_broker_uids")
      .select(
        "id, exchange_id, uid, withdrawable_balance, withdrawn_amount, accumulated_24h_payback, is_active"
      )
      .eq("id", user_broker_uid_id)
      .eq("user_id", userId)
      .single();

    if (uidError || !uidData) {
      return NextResponse.json({ error: "UID not found" }, { status: 404 });
    }

    // Check if user has sufficient withdrawable balance (with fresh read to prevent race condition)
    const withdrawableBalance = Number(uidData.withdrawable_balance) || 0;
    if (withdrawableBalance < amount_usd) {
      return NextResponse.json(
        { error: "Insufficient withdrawable balance" },
        { status: 400 }
      );
    }

    // Calculate new withdrawn amount
    const currentWithdrawn = Number(uidData.withdrawn_amount) || 0;
    const newWithdrawnAmount = currentWithdrawn + amount_usd;

    // Verify balance again after calculation to prevent race condition
    const accumulatedPayback = Number(uidData.accumulated_24h_payback) || 0;
    const newWithdrawableBalance = accumulatedPayback - newWithdrawnAmount;

    if (newWithdrawableBalance < 0) {
      return NextResponse.json(
        { error: "Insufficient withdrawable balance" },
        { status: 400 }
      );
    }

    // Update the UID with new withdrawn_amount (this will trigger balance recalculation)
    // Use optimistic locking: only update if withdrawable_balance hasn't changed
    const { data: updateData, error: updateError } = await supabase
      .from("user_broker_uids")
      .update({
        withdrawn_amount: newWithdrawnAmount,
        withdrawal_status: "pending",
      })
      .eq("id", user_broker_uid_id)
      .eq("withdrawable_balance", withdrawableBalance) // Optimistic locking to prevent race condition
      .select("id")
      .single();

    // If update affected 0 rows, it means balance changed (race condition detected)
    if (updateError || !updateData) {
      console.error(
        "Error updating withdrawn_amount or race condition detected:",
        updateError
      );

      // Retry with fresh data to check if balance is still sufficient
      const { data: retryUidData } = await supabase
        .from("user_broker_uids")
        .select(
          "withdrawable_balance, withdrawn_amount, accumulated_24h_payback"
        )
        .eq("id", user_broker_uid_id)
        .single();

      if (retryUidData) {
        const retryBalance = Number(retryUidData.withdrawable_balance) || 0;
        if (retryBalance < amount_usd) {
          return NextResponse.json(
            {
              error:
                "Insufficient withdrawable balance (concurrent request detected)",
            },
            { status: 400 }
          );
        }
        // If balance is still sufficient, retry the update without optimistic lock
        const { error: retryUpdateError } = await supabase
          .from("user_broker_uids")
          .update({
            withdrawn_amount:
              Number(retryUidData.withdrawn_amount) + amount_usd,
            withdrawal_status: "pending",
          })
          .eq("id", user_broker_uid_id);

        if (retryUpdateError) {
          return NextResponse.json(
            { error: "Failed to update withdrawal amount" },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json({ error: "UID not found" }, { status: 404 });
      }
    }

    // Create withdrawal request AFTER updating withdrawn_amount to ensure consistency
    const { data: withdrawal, error: createError } = await supabase
      .from("broker_rebate_withdrawals")
      .insert({
        user_id: userId,
        user_broker_uid_id,
        amount_usd,
        currency: "USDT",
        status: "pending",
        exchange_id: uidData.exchange_id,
        broker_uid: uidData.uid,
      })
      .select()
      .single();

    if (createError) {
      console.error("Create withdrawal error:", createError);

      // Rollback: revert withdrawn_amount if withdrawal creation failed
      // Get current withdrawn_amount first to calculate rollback value
      const { data: currentUidData } = await supabase
        .from("user_broker_uids")
        .select("withdrawn_amount")
        .eq("id", user_broker_uid_id)
        .single();

      if (currentUidData) {
        const rollbackAmount = Math.max(
          0,
          Number(currentUidData.withdrawn_amount) - amount_usd
        );
        await supabase
          .from("user_broker_uids")
          .update({
            withdrawn_amount: rollbackAmount,
            withdrawal_status: null,
          })
          .eq("id", user_broker_uid_id);
      }

      // If table doesn't exist, return helpful error
      if (
        createError.message.includes("relation") &&
        createError.message.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            error:
              "Withdrawal system not yet configured. Please contact support.",
          },
          { status: 503 }
        );
      }
      throw createError;
    }

    return NextResponse.json({ withdrawal });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: e.issues },
        { status: 400 }
      );
    }

    const message = e instanceof Error ? e.message : "unknown";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: "Failed to create withdrawal request" },
      { status }
    );
  }
}

// Helper function to get authenticated user
async function requireSessionUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("unauthorized");
  }

  return { supabase, userId: user.id };
}
