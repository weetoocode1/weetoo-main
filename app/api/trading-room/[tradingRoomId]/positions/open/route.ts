import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    // Calculate TP/SL values for RPC
    const hasValidTp = tpEnabled && takeProfitPrice && takeProfitPrice > 0;
    const hasValidSl = slEnabled && stopLossPrice && stopLossPrice > 0;

    // Use RPC function for atomic position creation + balance deduction
    // This ensures both operations succeed or both fail, with built-in balance checks
    const { error: rpcError } = await supabase.rpc(
      "open_position_and_update_balance",
      {
        p_room_id: tradingRoomId,
        p_user_id: userId ?? user.id,
        p_symbol: symbol,
        p_side: side,
        p_quantity: Number(quantity),
        p_entry_price: Number(entryPrice),
        p_leverage: Number(leverage),
        p_fee: openFee,
        p_initial_margin: initialMargin,
        p_liquidation_price: liquidationPrice,
        p_order_type: orderType,
        p_status: orderType === "market" ? "filled" : "pending",
        p_tp_enabled: hasValidTp,
        p_sl_enabled: hasValidSl,
        p_take_profit_price: hasValidTp ? takeProfitPrice : null,
        p_stop_loss_price: hasValidSl ? stopLossPrice : null,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      // RPC function handles insufficient balance and other errors
      return NextResponse.json(
        {
          error: rpcError.message || "Failed to open position",
          details: rpcError.message,
        },
        { status: 400 }
      );
    }

    // Query the created position to get its ID
    // We query by recent timestamp and matching parameters to find the position
    const { data: positions, error: fetchErr } = await supabase
      .from("trading_room_positions")
      .select("id")
      .eq("room_id", tradingRoomId)
      .eq("user_id", userId ?? user.id)
      .eq("symbol", symbol)
      .eq("side", side)
      .eq("entry_price", entryPrice)
      .eq("quantity", quantity)
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchErr || !positions) {
      console.error("Failed to fetch created position:", fetchErr);
      return NextResponse.json(
        {
          error: "Position created but failed to retrieve",
          details: fetchErr?.message,
        },
        { status: 500 }
      );
    }

    const position = { id: positions.id };

    // Position is already created with all fields via RPC function
    // No need to update after creation (avoids trigger restrictions)

    // Fetch updated room balance for response
    const { data: updatedRoom } = await supabase
      .from("trading_rooms")
      .select("virtual_balance")
      .eq("id", tradingRoomId)
      .single();

    // 3) Create TP/SL orders if enabled (use consistent validation)
    const tpSlOrders = [];
    let tpOrderId = null;
    let slOrderId = null;

    if (hasValidTp) {
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

    if (hasValidSl) {
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
