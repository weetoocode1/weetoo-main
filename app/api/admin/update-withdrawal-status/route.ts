import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const updateStatusSchema = z.object({
  withdrawal_id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
});

export async function PUT(request: NextRequest) {
  try {
    const { supabase, userId } = await requireAdminSession();
    const body = await request.json();

    const validatedData = updateStatusSchema.parse(body);
    const { withdrawal_id, status } = validatedData;

    // Get current withdrawal to check if it's approved
    const { data: currentWithdrawal, error: fetchError } = await supabase
      .from("broker_rebate_withdrawals")
      .select("status")
      .eq("id", withdrawal_id)
      .single();

    if (fetchError || !currentWithdrawal) {
      return NextResponse.json(
        { error: "Withdrawal request not found" },
        { status: 404 }
      );
    }

    // Prevent changing from approved to another status
    if (currentWithdrawal.status === "approved" && status !== "approved") {
      return NextResponse.json(
        { error: "Cannot change withdrawal status from approved" },
        { status: 400 }
      );
    }

    // Update the withdrawal status
    const updateData: {
      status: string;
      processed_by?: string;
      processed_at?: string;
    } = {
      status,
    };

    if (status === "approved" || status === "rejected") {
      updateData.processed_by = userId;
      updateData.processed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("broker_rebate_withdrawals")
      .update(updateData)
      .eq("id", withdrawal_id);

    if (updateError) {
      console.error("Error updating withdrawal status:", updateError);
      return NextResponse.json(
        { error: "Failed to update withdrawal status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal status updated successfully",
    });
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
      { error: "Failed to update withdrawal status" },
      { status }
    );
  }
}

async function requireAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("unauthorized");
  }

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

