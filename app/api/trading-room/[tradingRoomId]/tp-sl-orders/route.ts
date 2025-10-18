import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string }> }
) {
  try {
    const { tradingRoomId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      position_id,
      order_type,
      side,
      quantity,
      trigger_price,
      order_price,
    } = body;

    // Validate required fields
    if (!position_id || !order_type || !side || !quantity || !trigger_price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate order_type
    if (!["take_profit", "stop_loss"].includes(order_type)) {
      return NextResponse.json(
        { error: "Invalid order type" },
        { status: 400 }
      );
    }

    // Validate side
    if (!["long", "short"].includes(side)) {
      return NextResponse.json({ error: "Invalid side" }, { status: 400 });
    }

    // Create TP/SL order
    const { data: tpSlOrder, error: insertError } = await supabase
      .from("trading_room_tp_sl_orders")
      .insert({
        position_id,
        trading_room_id: tradingRoomId,
        user_id: user.id,
        order_type,
        side,
        quantity: parseFloat(quantity),
        trigger_price: parseFloat(trigger_price),
        order_price: order_price ? parseFloat(order_price) : null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating TP/SL order:", insertError);
      return NextResponse.json(
        { error: "Failed to create TP/SL order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order: tpSlOrder });
  } catch (error) {
    console.error("Error in TP/SL order creation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string }> }
) {
  try {
    const { tradingRoomId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const positionId = searchParams.get("position_id");

    let query = supabase
      .from("trading_room_tp_sl_orders")
      .select("*")
      .eq("trading_room_id", tradingRoomId)
      .eq("user_id", user.id);

    if (positionId) {
      query = query.eq("position_id", positionId);
    }

    const { data: orders, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching TP/SL orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch TP/SL orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching TP/SL orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
