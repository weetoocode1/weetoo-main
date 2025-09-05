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
      .select("id, exchange_id, uid, rebate_balance_usd, is_active")
      .eq("id", user_broker_uid_id)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (uidError || !uidData) {
      return NextResponse.json(
        { error: "UID not found or not active" },
        { status: 404 }
      );
    }

    // Check if user has sufficient balance
    if (uidData.rebate_balance_usd < amount_usd) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Check if user has any pending withdrawals for this UID
    const { data: pendingWithdrawals, error: pendingError } = await supabase
      .from("broker_rebate_withdrawals")
      .select("id")
      .eq("user_broker_uid_id", user_broker_uid_id)
      .eq("status", "pending");

    if (pendingError) throw pendingError;

    if (pendingWithdrawals && pendingWithdrawals.length > 0) {
      return NextResponse.json(
        { error: "You already have a pending withdrawal for this UID" },
        { status: 400 }
      );
    }

    // Create withdrawal request
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
