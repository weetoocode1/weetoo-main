import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    const { trigger_price, order_price, status } = body;

    // Validate status if provided
    if (status && !["pending", "active", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (trigger_price !== undefined)
      updateData.trigger_price = parseFloat(trigger_price);
    if (order_price !== undefined)
      updateData.order_price = order_price ? parseFloat(order_price) : null;
    if (status) updateData.status = status;

    const { data: order, error: updateError } = await supabase
      .from("trading_room_tp_sl_orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("trading_room_id", tradingRoomId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating TP/SL order:", updateError);
      return NextResponse.json(
        { error: "Failed to update TP/SL order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error updating TP/SL order:", error);
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

    const { data: order, error: deleteError } = await supabase
      .from("trading_room_tp_sl_orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("trading_room_id", tradingRoomId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (deleteError) {
      console.error("Error cancelling TP/SL order:", deleteError);
      return NextResponse.json(
        { error: "Failed to cancel TP/SL order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error cancelling TP/SL order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string; orderId: string }> }
) {
  try {
    const { tradingRoomId, orderId } = await params;
    const supabase = await createClient();

    // Check for service role secret
    const secret = request.headers.get("x-exec-secret");
    if (secret !== process.env.EXECUTE_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { current_price } = body;

    // Get the TP/SL order
    const { data: order, error: fetchError } = await supabase
      .from("trading_room_tp_sl_orders")
      .select("*")
      .eq("id", orderId)
      .eq("trading_room_id", tradingRoomId)
      .eq("status", "active")
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Order not found or not active" },
        { status: 404 }
      );
    }

    // Get the position
    const { data: position, error: positionError } = await supabase
      .from("trading_room_positions")
      .select("*")
      .eq("id", order.position_id)
      .single();

    if (positionError || !position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    // Execute the TP/SL order by closing the position
    const executionPrice =
      order.order_price || current_price || order.trigger_price;

    console.log(`🔧 Executing TP/SL order ${orderId}:`, {
      orderType: order.order_type,
      side: order.side,
      triggerPrice: order.trigger_price,
      executionPrice,
      positionId: order.position_id,
    });

    const { data: closedPosition, error: closeError } = await supabase
      .from("trading_room_positions")
      .update({
        status: "closed",
        close_price: executionPrice, // Fixed: use close_price instead of exit_price
        closed_at: new Date().toISOString(),
      })
      .eq("id", order.position_id)
      .eq("status", "filled") // Only close if position is still filled
      .select()
      .single();

    if (closeError) {
      console.error("Error closing position:", closeError);

      // Check if position is already closed
      if (closeError.code === "PGRST116") {
        // No rows returned
        console.log(
          `Position ${order.position_id} already closed or not found`
        );
        // Mark TP/SL order as cancelled since position is already closed
        await supabase
          .from("trading_room_tp_sl_orders")
          .update({ status: "cancelled" })
          .eq("id", order.id);

        return NextResponse.json(
          { error: "Position already closed" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to close position" },
        { status: 500 }
      );
    }

    // Mark TP/SL order as executed
    const { data: executedOrder, error: executeError } = await supabase
      .from("trading_room_tp_sl_orders")
      .update({
        status: "executed",
        execution_price: executionPrice,
        executed_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select()
      .single();

    if (executeError) {
      console.error("Error marking TP/SL order as executed:", executeError);
      return NextResponse.json(
        { error: "Failed to mark order as executed" },
        { status: 500 }
      );
    }

    // Cancel the opposite TP/SL order (if exists)
    const oppositeOrderType =
      order.order_type === "take_profit" ? "stop_loss" : "take_profit";

    await supabase
      .from("trading_room_tp_sl_orders")
      .update({ status: "cancelled" })
      .eq("position_id", order.position_id)
      .eq("order_type", oppositeOrderType)
      .eq("status", "active");

    return NextResponse.json({
      success: true,
      executed_order: executedOrder,
      closed_position: closedPosition,
    });
  } catch (error) {
    console.error("Error executing TP/SL order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
