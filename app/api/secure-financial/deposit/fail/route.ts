import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const service = await createServiceClient();

    // Auth + role check
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: me, error: meErr } = await authClient
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();
    if (meErr || !me || !["admin", "super_admin"].includes(me.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { depositId, reason } = body as {
      depositId?: string;
      reason?: string;
    };
    if (!depositId)
      return NextResponse.json({ error: "Missing depositId" }, { status: 400 });

    // Load deposit
    const { data: dep, error: depErr } = await service
      .from("deposit_requests")
      .select("id, user_id, kor_coins_amount, status")
      .eq("id", depositId)
      .single();
    if (depErr || !dep)
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });

    if (dep.status === "failed") {
      return NextResponse.json({ success: true, alreadyFailed: true });
    }

    // Update to failed
    const { error: updErr } = await service
      .from("deposit_requests")
      .update({
        status: "failed",
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dep.id);
    if (updErr)
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      );

    // Notify user
    try {
      await service.from("notifications").insert({
        user_id: dep.user_id,
        audience: "user",
        type: "deposit_failed",
        title: "Deposit Rejected",
        body: `Your deposit of ${
          (dep.kor_coins_amount as number)?.toLocaleString?.() ||
          dep.kor_coins_amount
        } KOR was rejected`,
        metadata: {
          deposit_id: dep.id,
          kor_coins_amount: dep.kor_coins_amount,
          reason: reason || null,
        },
        read: false,
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
