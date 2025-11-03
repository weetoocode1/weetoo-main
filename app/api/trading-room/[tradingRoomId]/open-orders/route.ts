import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface RouteParams {
  tradingRoomId: string;
}

// GET /api/trading-room/[tradingRoomId]/open-orders
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { tradingRoomId } = await params;
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || undefined;
    const side = searchParams.get("side") || undefined;
    const status = searchParams.get("status") || "open";

    let q = supabase
      .from("trading_room_open_orders")
      .select(
        `id, room_id, user_id, symbol, side, order_type, limit_price, quantity, status, time_in_force, leverage, created_at, filled_at, tp_enabled, sl_enabled, take_profit_price, stop_loss_price`
      )
      .eq("room_id", tradingRoomId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (symbol) q = q.eq("symbol", symbol);
    if (side) q = q.eq("side", side);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch open orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/trading-room/[tradingRoomId]/open-orders
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { tradingRoomId } = await params;
    const body = await req.json();
    const {
      symbol,
      side,
      limitPrice,
      quantity,
      leverage = 1,
      timeInForce = "GTC",
      tpEnabled,
      slEnabled,
      takeProfitPrice,
      stopLossPrice,
    } = body || {};
    if (!tradingRoomId || !symbol || !side || !limitPrice || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("trading_room_open_orders")
      .insert([
        {
          room_id: tradingRoomId,
          user_id: userId,
          symbol,
          side,
          order_type: "limit",
          limit_price: Number(limitPrice),
          quantity: Number(quantity),
          time_in_force: timeInForce,
          leverage: Number(leverage) || 1,
          status: "open",
          // TP/SL data
          tp_enabled: tpEnabled || false,
          sl_enabled: slEnabled || false,
          take_profit_price: takeProfitPrice ? Number(takeProfitPrice) : null,
          stop_loss_price: stopLossPrice ? Number(stopLossPrice) : null,
        },
      ])
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/trading-room/[tradingRoomId]/open-orders
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { tradingRoomId } = await params;
    const body = await req.json();
    const { action, orderId, fillPrice, bid, ask } = body || {};
    if (!tradingRoomId || !orderId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Fetch order
    const { data: order, error: ordErr } = await supabase
      .from("trading_room_open_orders")
      .select(
        "id, room_id, user_id, symbol, side, limit_price, quantity, leverage, status, tp_enabled, sl_enabled, take_profit_price, stop_loss_price"
      )
      .eq("id", orderId)
      .eq("room_id", tradingRoomId)
      .single();
    if (ordErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "cancel") {
      if (order.status !== "open") {
        return NextResponse.json({ ok: true });
      }
      const { error: upErr } = await supabase
        .from("trading_room_open_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("room_id", tradingRoomId);
      if (upErr)
        return NextResponse.json(
          { error: "Failed to cancel" },
          { status: 500 }
        );
      return NextResponse.json({ ok: true });
    }

    if (action === "fill") {
      if (order.status !== "open") return NextResponse.json({ ok: true });
      // Prefer bid/ask provided from client matcher; fallback to given fillPrice; then limit
      const preferred = order.side === "long" ? ask : bid;
      // Use limit price as fallback if fillPrice is 0 or invalid
      const validFillPrice =
        fillPrice && fillPrice > 0 ? fillPrice : order.limit_price;
      const entryPrice = Number(preferred ?? validFillPrice);

      // Ensure entryPrice is valid
      if (!entryPrice || entryPrice <= 0) {
        console.error("Invalid entry price:", {
          preferred,
          fillPrice,
          validFillPrice,
          limit_price: order.limit_price,
          ask,
          bid,
        });
        return NextResponse.json(
          { error: "Invalid entry price" },
          { status: 400 }
        );
      }

      console.log("📊 Filling limit order:", {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        limit_price: order.limit_price,
        entryPrice,
        preferred,
        fillPrice,
        bid,
        ask,
      });
      const qty = Number(order.quantity);
      const lev = Number(order.leverage || 1);
      const size = entryPrice * qty;
      const feeRate = 0.0005;
      const openFee = size * feeRate;
      const initialMargin = lev > 0 ? size / lev : size;
      const MMR = 0.005;
      const liq =
        order.side === "long"
          ? entryPrice * (1 - 1 / lev + MMR)
          : entryPrice * (1 + 1 / lev - MMR);

      // Calculate TP/SL values for RPC
      const hasValidTp =
        order.tp_enabled &&
        order.take_profit_price &&
        order.take_profit_price > 0;
      const hasValidSl =
        order.sl_enabled && order.stop_loss_price && order.stop_loss_price > 0;

      // Use RPC function for atomic position creation + balance deduction
      // This ensures both operations succeed or both fail, with built-in balance checks
      const { error: rpcError } = await supabase.rpc(
        "open_position_and_update_balance",
        {
          p_room_id: tradingRoomId,
          p_user_id: order.user_id,
          p_symbol: order.symbol,
          p_side: order.side,
          p_quantity: qty,
          p_entry_price: entryPrice,
          p_leverage: lev,
          p_fee: openFee,
          p_initial_margin: initialMargin,
          p_liquidation_price: liq,
          p_order_type: "limit",
          p_status: "filled",
          p_tp_enabled: hasValidTp,
          p_sl_enabled: hasValidSl,
          p_take_profit_price: hasValidTp ? order.take_profit_price : null,
          p_stop_loss_price: hasValidSl ? order.stop_loss_price : null,
        }
      );

      if (rpcError) {
        console.error("RPC error:", rpcError);
        // RPC function handles insufficient balance and other errors
        return NextResponse.json(
          {
            error: rpcError.message || "Failed to create position",
            details: rpcError.message,
          },
          { status: 400 }
        );
      }

      // Query the created position to get its ID
      const { data: posData, error: fetchErr } = await supabase
        .from("trading_room_positions")
        .select("id")
        .eq("room_id", tradingRoomId)
        .eq("user_id", order.user_id)
        .eq("symbol", order.symbol)
        .eq("side", order.side)
        .eq("entry_price", entryPrice)
        .eq("quantity", qty)
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchErr || !posData) {
        console.error("Failed to fetch created position:", fetchErr);
        return NextResponse.json(
          {
            error: "Position created but failed to retrieve",
            details: fetchErr?.message,
          },
          { status: 500 }
        );
      }

      const pos = { id: posData.id };

      // Position is already created with all fields via RPC function
      // No need to update after creation (avoids trigger restrictions)

      // Create TP/SL orders if enabled (after position is created)
      const tpSlOrders = [];
      let tpOrderId = null;
      let slOrderId = null;

      if (hasValidTp) {
        const { data: tpOrder, error: tpError } = await supabase
          .from("trading_room_tp_sl_orders")
          .insert({
            position_id: pos.id,
            trading_room_id: tradingRoomId,
            user_id: order.user_id,
            order_type: "take_profit",
            side: order.side,
            quantity: qty,
            trigger_price: order.take_profit_price,
            order_price: order.take_profit_price, // Use limit order for TP
            status: "active", // Activate immediately after limit order fills
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
            position_id: pos.id,
            trading_room_id: tradingRoomId,
            user_id: order.user_id,
            order_type: "stop_loss",
            side: order.side,
            quantity: qty,
            trigger_price: order.stop_loss_price,
            order_price: order.stop_loss_price, // Use limit order for SL
            status: "active", // Activate immediately after limit order fills
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
          .eq("id", pos.id);

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

      // Mark order filled
      const { error: updErr } = await supabase
        .from("trading_room_open_orders")
        .update({
          status: "filled",
          filled_at: new Date().toISOString(),
          position_id: pos?.id,
        })
        .eq("id", orderId)
        .eq("room_id", tradingRoomId);
      if (updErr)
        return NextResponse.json(
          { error: "Failed to update order" },
          { status: 500 }
        );

      return NextResponse.json({
        positionId: pos?.id,
        tpSlOrders: tpSlOrders.length > 0 ? tpSlOrders : undefined,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
