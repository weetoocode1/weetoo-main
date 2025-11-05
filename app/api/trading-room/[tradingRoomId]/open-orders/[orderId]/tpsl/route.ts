import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  tradingRoomId: string;
  orderId: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { tradingRoomId, orderId } = await params;
    const supabase = await createServiceClient();

    const body = await request.json();
    const {
      tp_enabled,
      sl_enabled,
      take_profit_price,
      stop_loss_price,
    } = body as {
      tp_enabled?: boolean;
      sl_enabled?: boolean;
      take_profit_price?: number | null;
      stop_loss_price?: number | null;
    };

    if (tp_enabled === undefined && sl_enabled === undefined) {
      return NextResponse.json(
        { error: "At least one of tp_enabled or sl_enabled must be provided" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("trading_room_open_orders")
      .select("*")
      .eq("id", orderId)
      .eq("room_id", tradingRoomId)
      .eq("status", "open")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found or not open" },
        { status: 404 }
      );
    }

    const limitPrice = Number(order.limit_price);
    const side = order.side;

    if (tp_enabled && take_profit_price !== null && take_profit_price !== undefined) {
      if (side === "long" && take_profit_price <= limitPrice) {
        return NextResponse.json(
          { error: "Take profit price must be higher than limit price for long orders" },
          { status: 400 }
        );
      }
      if (side === "short" && take_profit_price >= limitPrice) {
        return NextResponse.json(
          { error: "Take profit price must be lower than limit price for short orders" },
          { status: 400 }
        );
      }
    }

    if (sl_enabled && stop_loss_price !== null && stop_loss_price !== undefined) {
      if (side === "long" && stop_loss_price >= limitPrice) {
        return NextResponse.json(
          { error: "Stop loss price must be lower than limit price for long orders" },
          { status: 400 }
        );
      }
      if (side === "short" && stop_loss_price <= limitPrice) {
        return NextResponse.json(
          { error: "Stop loss price must be higher than limit price for short orders" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (tp_enabled !== undefined) {
      updateData.tp_enabled = tp_enabled;
      if (!tp_enabled) {
        updateData.take_profit_price = null;
      } else if (take_profit_price !== undefined) {
        updateData.take_profit_price = take_profit_price;
      }
    }

    if (sl_enabled !== undefined) {
      updateData.sl_enabled = sl_enabled;
      if (!sl_enabled) {
        updateData.stop_loss_price = null;
      } else if (stop_loss_price !== undefined) {
        updateData.stop_loss_price = stop_loss_price;
      }
    }

    const { error: updateError } = await supabase
      .from("trading_room_open_orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("room_id", tradingRoomId);

    if (updateError) {
      console.error("Error updating open order TP/SL:", updateError);
      return NextResponse.json(
        { error: "Failed to update order TP/SL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "TP/SL updated successfully",
    });
  } catch (error) {
    console.error("Error updating open order TP/SL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

