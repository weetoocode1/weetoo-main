import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  tradingRoomId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { tradingRoomId } = await params;
    const body = await request.json();

    // Debug logging to see what values we're receiving
    console.log("📊 Position creation request data:", {
      tpEnabled: body.tpEnabled,
      slEnabled: body.slEnabled,
      takeProfitPrice: body.takeProfitPrice,
      stopLossPrice: body.stopLossPrice,
      tpEnabledType: typeof body.tpEnabled,
      slEnabledType: typeof body.slEnabled,
      takeProfitPriceType: typeof body.takeProfitPrice,
      stopLossPriceType: typeof body.stopLossPrice,
    });

    const {
      symbol,
      side, // 'long' | 'short'
      quantity,
      entryPrice,
      leverage = 1,
      orderType = "market", // 'market' | 'limit'
      feeRate = 0.0005, // default 5 bps
      userId,
      // TP/SL parameters
      tpEnabled = false,
      slEnabled = false,
      takeProfitPrice,
      stopLossPrice,
    } = body as {
      symbol: string;
      side: "long" | "short";
      quantity: number;
      entryPrice: number;
      leverage?: number;
      orderType?: "market" | "limit";
      feeRate?: number;
      userId?: string;
      tpEnabled?: boolean;
      slEnabled?: boolean;
      takeProfitPrice?: number;
      stopLossPrice?: number;
    };

    if (!tradingRoomId || !symbol || !side || !quantity || !entryPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Resolve authenticated user for NOT NULL user_id
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json(
        { error: "Unauthorized: user not found" },
        { status: 401 }
      );
    }

    const orderValue = Number(quantity) * Number(entryPrice);
    const openFee = orderValue * Number(feeRate);
    const initialMargin = leverage > 0 ? orderValue / leverage : orderValue;
    const totalCost = initialMargin + openFee;

    // Estimate liquidation price using a simple linear USDT-margined model
    // liq_long = entry * (1 - 1/leverage + MMR)
    // liq_short = entry * (1 + 1/leverage - MMR)
    const MMR = 0.005; // 0.5% maintenance margin rate (adjust if you have exact)
    const calcLiq = (s: "long" | "short", entry: number, lev: number) => {
      if (!entry || !lev || lev <= 0) return 0;
      if (s === "long") return entry * (1 - 1 / lev + MMR);
      return entry * (1 + 1 / lev - MMR);
    };
    const liquidationPrice = calcLiq(
      side,
      Number(entryPrice),
      Number(leverage)
    );

    // Debug: Log the values that will be inserted
    console.log("📊 Values being inserted into database:", {
      tp_enabled: tpEnabled || false,
      sl_enabled: slEnabled || false,
      take_profit_price:
        tpEnabled && takeProfitPrice && takeProfitPrice > 0
          ? takeProfitPrice
          : null,
      stop_loss_price:
        slEnabled && stopLossPrice && stopLossPrice > 0 ? stopLossPrice : null,
    });

    // 1) Insert position (open)
    const { data: position, error: insertErr } = await supabase
      .from("trading_room_positions")
      .insert([
        {
          room_id: tradingRoomId,
          user_id: userId ?? user.id,
          symbol,
          side,
          quantity,
          size: orderValue,
          entry_price: entryPrice,
          initial_margin: initialMargin,
          leverage,
          fee: openFee,
          liquidation_price: liquidationPrice,
          order_type: orderType,
          status: orderType === "market" ? "filled" : "pending",
          opened_at: new Date().toISOString(),
          // TP/SL columns - ensure proper null handling for constraint
          tp_enabled: tpEnabled || false,
          sl_enabled: slEnabled || false,
          take_profit_price:
            tpEnabled && takeProfitPrice && takeProfitPrice > 0
              ? takeProfitPrice
              : null,
          stop_loss_price:
            slEnabled && stopLossPrice && stopLossPrice > 0
              ? stopLossPrice
              : null,
        },
      ])
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: "Failed to open position", details: insertErr.message },
        { status: 500 }
      );
    }

    // 2) Deduct from room virtual balance directly
    const { data: updatedRoom, error: balErr } = await supabase
      .from("trading_rooms")
      .update({
        virtual_balance: undefined, // Will be handled by fallback logic below
      })
      .eq("id", tradingRoomId)
      .select("virtual_balance")
      .single();

    // Workaround: Supabase client doesn't support arithmetic in object; do it via RPC-less approach
    if (balErr) {
      // Fallback: fetch current, then write new value
      const { data: roomNow } = await supabase
        .from("trading_rooms")
        .select("virtual_balance")
        .eq("id", tradingRoomId)
        .single();
      const current = Number(roomNow?.virtual_balance ?? 0);
      const nextBalance = current - totalCost;
      const { error: updErr } = await supabase
        .from("trading_rooms")
        .update({ virtual_balance: nextBalance })
        .eq("id", tradingRoomId);
      if (updErr) {
        return NextResponse.json(
          {
            error: "Failed to update virtual balance",
            details: updErr.message,
          },
          { status: 500 }
        );
      }
    }

    // 3) Create TP/SL orders if enabled
    const tpSlOrders = [];
    let tpOrderId = null;
    let slOrderId = null;

    if (tpEnabled && takeProfitPrice && takeProfitPrice > 0) {
      const { data: tpOrder, error: tpError } = await supabase
        .from("trading_room_tp_sl_orders")
        .insert({
          position_id: position.id,
          trading_room_id: tradingRoomId,
          user_id: userId ?? user.id,
          order_type: "take_profit",
          side,
          quantity,
          trigger_price: takeProfitPrice,
          order_price: takeProfitPrice, // Use limit order for TP
          status: orderType === "market" ? "active" : "pending", // Market orders activate immediately
        })
        .select()
        .single();

      if (!tpError) {
        tpSlOrders.push(tpOrder);
        tpOrderId = tpOrder.id;
      } else {
        console.error("Failed to create TP order:", tpError);
      }
    }

    if (slEnabled && stopLossPrice && stopLossPrice > 0) {
      const { data: slOrder, error: slError } = await supabase
        .from("trading_room_tp_sl_orders")
        .insert({
          position_id: position.id,
          trading_room_id: tradingRoomId,
          user_id: userId ?? user.id,
          order_type: "stop_loss",
          side,
          quantity,
          trigger_price: stopLossPrice,
          order_price: null, // Use market order for SL
          status: orderType === "market" ? "active" : "pending", // Market orders activate immediately
        })
        .select()
        .single();

      if (!slError) {
        tpSlOrders.push(slOrder);
        slOrderId = slOrder.id;
      } else {
        console.error("Failed to create SL order:", slError);
      }
    }

    // Update position with TP/SL order IDs and status (CRITICAL for UI display)
    if (tpOrderId || slOrderId) {
      // Use a more targeted update to avoid trigger issues
      const updateData: Record<string, unknown> = {};
      if (tpOrderId) {
        updateData.tp_order_id = tpOrderId;
        updateData.tp_status = "active";
      }
      if (slOrderId) {
        updateData.sl_order_id = slOrderId;
        updateData.sl_status = "active";
      }

      const { error: updatePosError } = await supabase
        .from("trading_room_positions")
        .update(updateData)
        .eq("id", position.id);

      if (updatePosError) {
        console.error(
          "❌ Failed to update position with TP/SL order IDs:",
          updatePosError.message
        );
        // Don't fail the entire operation, just log the error
        console.warn("⚠️ Continuing without updating position TP/SL status");
      } else {
        console.log("✅ Position updated with TP/SL order IDs and status");
      }
    }

    return NextResponse.json(
      {
        id: position.id,
        orderValue,
        openFee,
        initialMargin,
        totalCost,
        virtualBalance: updatedRoom?.virtual_balance,
        tpSlOrders,
        orderType,
        tpSlActivation: orderType === "market" ? "immediate" : "on_fill",
      },
      { status: 200 }
    );
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
