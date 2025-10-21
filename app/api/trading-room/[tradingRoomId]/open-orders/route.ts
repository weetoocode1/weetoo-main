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

      // Insert position with TP/SL data
      const { data: pos, error: insErr } = await supabase
        .from("trading_room_positions")
        .insert([
          {
            room_id: tradingRoomId,
            user_id: order.user_id,
            symbol: order.symbol,
            side: order.side,
            quantity: qty,
            size,
            entry_price: entryPrice,
            initial_margin: initialMargin,
            leverage: lev,
            fee: openFee,
            liquidation_price: liq,
            order_type: "limit",
            status: "filled",
            // TP/SL columns - ensure proper null handling for constraint
            tp_enabled: order.tp_enabled || false,
            sl_enabled: order.sl_enabled || false,
            take_profit_price:
              order.tp_enabled &&
              order.take_profit_price &&
              order.take_profit_price > 0
                ? order.take_profit_price
                : null,
            stop_loss_price:
              order.sl_enabled &&
              order.stop_loss_price &&
              order.stop_loss_price > 0
                ? order.stop_loss_price
                : null,
          },
        ])
        .select("id")
        .single();
      if (insErr)
        return NextResponse.json(
          { error: "Failed to create position" },
          { status: 500 }
        );

      // Fetch current balance and prevent negative balance
      const { data: roomRow } = await supabase
        .from("trading_rooms")
        .select("virtual_balance")
        .eq("id", tradingRoomId)
        .single();
      const current = Number(roomRow?.virtual_balance ?? 0);

      // Strict guard: ensure sufficient funds before proceeding
      const requiredCost = initialMargin + openFee;
      if (!Number.isFinite(current) || current < requiredCost) {
        return NextResponse.json(
          { error: "Insufficient balance for required margin and fees" },
          { status: 400 }
        );
      }

      const nextBalance = Math.max(0, current - requiredCost);
      const { error: balErr } = await supabase
        .from("trading_rooms")
        .update({ virtual_balance: nextBalance })
        .eq("id", tradingRoomId);
      if (balErr)
        return NextResponse.json(
          { error: "Failed to update balance" },
          { status: 500 }
        );

      // Create TP/SL orders if enabled (after position is created)
      const tpSlOrders = [];
      let tpOrderId = null;
      let slOrderId = null;

      if (
        order.tp_enabled &&
        order.take_profit_price &&
        order.take_profit_price > 0
      ) {
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

      if (
        order.sl_enabled &&
        order.stop_loss_price &&
        order.stop_loss_price > 0
      ) {
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
