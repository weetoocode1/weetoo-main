import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const { data: position, error: posError } = await supabase
      .from("trading_room_positions")
      .select("*")
      .eq("id", positionId)
      .eq("room_id", tradingRoomId)
      .is("closed_at", null)
      .single();

    if (posError || !position) {
      return NextResponse.json(
        { error: "Position not found or already closed" },
        { status: 404 }
      );
    }

    const entryPrice = Number(position.entry_price);
    const side = position.side;
    const quantity = Number(position.quantity);

    if (tp_enabled && take_profit_price !== null && take_profit_price !== undefined) {
      if (side === "long" && take_profit_price <= entryPrice) {
        return NextResponse.json(
          { error: "Take profit price must be higher than entry price for long positions" },
          { status: 400 }
        );
      }
      if (side === "short" && take_profit_price >= entryPrice) {
        return NextResponse.json(
          { error: "Take profit price must be lower than entry price for short positions" },
          { status: 400 }
        );
      }
    }

    if (sl_enabled && stop_loss_price !== null && stop_loss_price !== undefined) {
      if (side === "long" && stop_loss_price >= entryPrice) {
        return NextResponse.json(
          { error: "Stop loss price must be lower than entry price for long positions" },
          { status: 400 }
        );
      }
      if (side === "short" && stop_loss_price <= entryPrice) {
        return NextResponse.json(
          { error: "Stop loss price must be higher than entry price for short positions" },
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

    const hasValidTp = (tp_enabled ?? position.tp_enabled) && (take_profit_price ?? position.take_profit_price);
    const hasValidSl = (sl_enabled ?? position.sl_enabled) && (stop_loss_price ?? position.stop_loss_price);

    const { error: updateError } = await supabase
      .from("trading_room_positions")
      .update(updateData)
      .eq("id", positionId);

    if (updateError) {
      console.error("Error updating position TP/SL:", updateError);
      return NextResponse.json(
        { error: "Failed to update position TP/SL" },
        { status: 500 }
      );
    }

    const tpPrice = hasValidTp ? (take_profit_price ?? position.take_profit_price) : null;
    const slPrice = hasValidSl ? (stop_loss_price ?? position.stop_loss_price) : null;

    if (hasValidTp && tpPrice) {
      const existingTpOrder = position.tp_order_id
        ? await supabase
            .from("trading_room_tp_sl_orders")
            .select("*")
            .eq("id", position.tp_order_id)
            .single()
        : { data: null, error: null };

      if (existingTpOrder.data) {
        await supabase
          .from("trading_room_tp_sl_orders")
          .update({
            trigger_price: tpPrice,
            order_price: tpPrice,
            status: "active",
          })
          .eq("id", existingTpOrder.data.id);
      } else {
        const { data: newTpOrder } = await supabase
          .from("trading_room_tp_sl_orders")
          .insert({
            position_id: positionId,
            trading_room_id: tradingRoomId,
            user_id: position.user_id,
            order_type: "take_profit",
            side,
            quantity,
            trigger_price: tpPrice,
            order_price: tpPrice,
            status: "active",
          })
          .select()
          .single();

        if (newTpOrder) {
          await supabase
            .from("trading_room_positions")
            .update({
              tp_order_id: newTpOrder.id,
              tp_status: "active",
            })
            .eq("id", positionId);
        }
      }
    } else if (position.tp_order_id) {
      await supabase
        .from("trading_room_tp_sl_orders")
        .update({ status: "cancelled" })
        .eq("id", position.tp_order_id);

      await supabase
        .from("trading_room_positions")
        .update({
          tp_order_id: null,
          tp_status: null,
        })
        .eq("id", positionId);
    }

    if (hasValidSl && slPrice) {
      const existingSlOrder = position.sl_order_id
        ? await supabase
            .from("trading_room_tp_sl_orders")
            .select("*")
            .eq("id", position.sl_order_id)
            .single()
        : { data: null, error: null };

      if (existingSlOrder.data) {
        await supabase
          .from("trading_room_tp_sl_orders")
          .update({
            trigger_price: slPrice,
            order_price: null,
            status: "active",
          })
          .eq("id", existingSlOrder.data.id);
      } else {
        const { data: newSlOrder } = await supabase
          .from("trading_room_tp_sl_orders")
          .insert({
            position_id: positionId,
            trading_room_id: tradingRoomId,
            user_id: position.user_id,
            order_type: "stop_loss",
            side,
            quantity,
            trigger_price: slPrice,
            order_price: null,
            status: "active",
          })
          .select()
          .single();

        if (newSlOrder) {
          await supabase
            .from("trading_room_positions")
            .update({
              sl_order_id: newSlOrder.id,
              sl_status: "active",
            })
            .eq("id", positionId);
        }
      }
    } else if (position.sl_order_id) {
      await supabase
        .from("trading_room_tp_sl_orders")
        .update({ status: "cancelled" })
        .eq("id", position.sl_order_id);

      await supabase
        .from("trading_room_positions")
        .update({
          sl_order_id: null,
          sl_status: null,
        })
        .eq("id", positionId);
    }

    return NextResponse.json({
      success: true,
      message: "TP/SL updated successfully",
    });
  } catch (error) {
    console.error("Error updating position TP/SL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

