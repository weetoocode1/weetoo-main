import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const serviceClient = await createServiceClient();

    // Authenticate caller
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify role is admin or super_admin
    const { data: me, error: meError } = await authClient
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();
    if (meError || !me || !["admin", "super_admin"].includes(me.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { depositId } = body as { depositId?: string };
    if (!depositId) {
      return NextResponse.json({ error: "Missing depositId" }, { status: 400 });
    }

    // Load deposit request
    const { data: deposit, error: depErr } = await serviceClient
      .from("deposit_requests")
      .select("id, user_id, kor_coins_amount, status, payment_status")
      .eq("id", depositId)
      .single();
    if (depErr || !deposit) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    // Idempotency: if already completed, no-op
    if (
      deposit.payment_status === "completed" &&
      deposit.status === "completed"
    ) {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    // Fetch current user balance
    const { data: userRow, error: userErr } = await serviceClient
      .from("users")
      .select("id, kor_coins")
      .eq("id", deposit.user_id)
      .single();
    if (userErr || !userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newBalance =
      (userRow.kor_coins || 0) + (deposit.kor_coins_amount || 0);

    // Update balance first
    const { error: balUpdateErr } = await serviceClient
      .from("users")
      .update({ kor_coins: newBalance })
      .eq("id", deposit.user_id);
    if (balUpdateErr) {
      return NextResponse.json(
        { error: "Failed to credit balance" },
        { status: 500 }
      );
    }

    // Mark deposit as completed
    const { error: depUpdateErr } = await serviceClient
      .from("deposit_requests")
      .update({
        status: "completed",
        payment_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id);
    if (depUpdateErr) {
      // Best-effort rollback (subtract coins back) if marking failed
      await serviceClient
        .from("users")
        .update({ kor_coins: userRow.kor_coins || 0 })
        .eq("id", deposit.user_id);
      return NextResponse.json(
        { error: "Failed to complete deposit" },
        { status: 500 }
      );
    }

    // Optional: create notification to the user
    try {
      await serviceClient.from("notifications").insert({
        user_id: deposit.user_id,
        audience: "user",
        type: "deposit_completed",
        title: "KOR Coins Credited",
        body: `${
          deposit.kor_coins_amount?.toLocaleString?.() ||
          deposit.kor_coins_amount
        } KOR have been credited to your account`,
        metadata: {
          deposit_id: deposit.id,
          kor_coins_amount: deposit.kor_coins_amount,
        },
        read: false,
      });
    } catch {}

    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error("Complete deposit API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
