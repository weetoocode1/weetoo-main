import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface RouteParams {
  tradingRoomId: string;
  positionId: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { tradingRoomId, positionId } = await params;
    const supabase = await createServiceClient();

    // Get the position
    const { data: position, error: posError } = await supabase
      .from("trading_room_positions")
      .select("*")
      .eq("id", positionId)
      .eq("room_id", tradingRoomId)
      .single();

    if (posError || !position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    // Get active TP/SL orders for this position
    const { data: tpSlOrders, error: tpSlError } = await supabase
      .from("trading_room_tp_sl_orders")
      .select("*")
      .eq("position_id", positionId)
      .eq("status", "active");

    if (tpSlError) {
      return NextResponse.json(
        { error: "Failed to fetch TP/SL orders" },
        { status: 500 }
      );
    }

    // Update position with correct TP/SL status
    const updateData: Record<string, unknown> = {};

    // Check for TP order
    const tpOrder = tpSlOrders?.find(
      (order) => order.order_type === "take_profit"
    );
    if (tpOrder) {
      updateData.tp_order_id = tpOrder.id;
      updateData.tp_status = "active";
    }

    // Check for SL order
    const slOrder = tpSlOrders?.find(
      (order) => order.order_type === "stop_loss"
    );
    if (slOrder) {
      updateData.sl_order_id = slOrder.id;
      updateData.sl_status = "active";
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("trading_room_positions")
        .update(updateData)
        .eq("id", positionId);

      if (updateError) {
        console.error("Failed to update position TP/SL status:", updateError);
        return NextResponse.json(
          { error: "Failed to update position" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      updated: updateData,
      tpSlOrders: tpSlOrders?.length || 0,
    });
  } catch (error) {
    console.error("Error updating TP/SL status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
