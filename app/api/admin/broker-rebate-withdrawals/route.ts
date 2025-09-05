import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

// Validation schema for admin updates
const updateWithdrawalSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "processing", "completed", "failed"]),
  admin_notes: z.string().optional(),
});

type WithdrawalUpdateData = {
  status: z.infer<typeof updateWithdrawalSchema>["status"];
  processed_by: string;
  processed_at: string;
  admin_notes?: string;
};

// GET: Fetch all withdrawal requests for admin review
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("broker_rebate_withdrawals")
      .select(
        `
        id,
        amount_usd,
        currency,
        status,
        exchange_id,
        broker_uid,
        processed_by,
        processed_at,
        admin_notes,
        created_at,
        updated_at,
        user_broker_uids!inner(
          exchange_id,
          uid
        ),
        users!inner(
          id,
          email,
          full_name
        )
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from("broker_rebate_withdrawals")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    return NextResponse.json({
      withdrawals: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: "Failed to load withdrawals" },
      { status }
    );
  }
}

// PUT: Update withdrawal status (approve/reject/process)
export async function PUT(request: NextRequest) {
  try {
    const { supabase, userId } = await requireAdminSession();
    const body = await request.json();

    // Validate request body
    const validatedData = updateWithdrawalSchema.parse(body);
    const { id, status, admin_notes } = validatedData;

    // Get current withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from("broker_rebate_withdrawals")
      .select("id, status, user_broker_uid_id, amount_usd")
      .eq("id", id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    // Update withdrawal status
    const updateData: WithdrawalUpdateData = {
      status,
      processed_by: userId,
      processed_at: new Date().toISOString(),
    };

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from("broker_rebate_withdrawals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If approved, we might want to deduct from user's balance
    // (This could be done here or in a separate processing step)
    if (status === "approved") {
      // For now, we'll just mark it as approved
      // The actual balance deduction could happen when processing the withdrawal
      console.log(`Withdrawal ${id} approved for processing`);
    }

    return NextResponse.json({ withdrawal: updatedWithdrawal });
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
      { error: "Failed to update withdrawal" },
      { status }
    );
  }
}

// Helper function to get authenticated admin user
async function requireAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("unauthorized");
  }

  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    throw new Error("unauthorized");
  }

  if (!["admin", "super_admin"].includes(userData.role)) {
    throw new Error("unauthorized");
  }

  return { supabase, userId: user.id };
}
