import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STATUS_MAP = {
  cancelled: "cancelled",
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string; orderId: string }> }
) {
  try {
    const { tradingRoomId, orderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = body?.action as string | undefined;

    if (action !== "cancel") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("trading_room_scheduled_orders")
      .update({ status: STATUS_MAP.cancelled })
      .eq("id", orderId)
      .eq("trading_room_id", tradingRoomId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string; orderId: string }> }
) {
  try {
    const { tradingRoomId, orderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("trading_room_scheduled_orders")
      .delete()
      .eq("id", orderId)
      .eq("trading_room_id", tradingRoomId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
