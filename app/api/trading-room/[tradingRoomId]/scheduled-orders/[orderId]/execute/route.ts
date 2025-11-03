import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface ScheduledOrder {
  id: string;
  trading_room_id: string;
  user_id: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  price?: number;
  leverage: number;
  schedule_type: string;
  scheduled_at?: string;
  trigger_condition?: string;
  trigger_price?: number;
  status: string;
  tp_enabled?: boolean;
  sl_enabled?: boolean;
  take_profit_price?: number;
  stop_loss_price?: number;
}

const EXECUTION_STATUS_MAP = {
  executed: "executed",
  failed: "failed",
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string; orderId: string }> }
) {
  try {
    const { tradingRoomId, orderId } = await params;
    const supabase = await createServiceClient();
    // Allow empty body (scheduler may not send one)
    let current_price: number | undefined;
    try {
      const body = await request.json();
      current_price = body?.current_price;
    } catch {}

    console.log(
      `EXECUTE API CALLED: ${orderId} at ${new Date().toISOString()}`
    );

    // Accept trusted calls from scheduler using shared secret
    // const reqSecret = request.headers.get("x-exec-secret");
    // const execSecret = process.env.EXECUTE_SECRET;

    // First, try to mark the order as "executing" to prevent duplicate execution
    const { data: order, error: fetchError } = await supabase
      .from("trading_room_scheduled_orders")
      .select("*")
      .eq("id", orderId)
      .eq("trading_room_id", tradingRoomId)
      .in("status", ["pending", "watching"]) // allow both states
      .single();

    if (fetchError || !order) {
      console.log(`ORDER NOT FOUND: ${fetchError?.message}`);
      // If order not found, it might already be executed - return success
      return NextResponse.json(
        { success: true, message: "Order already executed or not found" },
        { status: 200 }
      );
    }

    // Immediately mark as "watching" to prevent race conditions
    const { error: lockError } = await supabase
      .from("trading_room_scheduled_orders")
      .update({ status: "watching" })
      .eq("id", orderId)
      .eq("status", order.status); // Only update if status hasn't changed

    if (lockError) {
      console.log(`ORDER ALREADY BEING EXECUTED: ${lockError.message}`);
      return NextResponse.json(
        { success: true, message: "Order already being executed" },
        { status: 200 }
      );
    }

    const now = new Date();
    const scheduledTime = new Date(order.scheduled_at);

    const isTimeBasedReady =
      order.schedule_type === "time_based" && scheduledTime <= now;
    // If price-based and no price provided, fetch current price server-side
    let evaluatedPrice = current_price;
    if (
      order.schedule_type === "price_based" &&
      (typeof evaluatedPrice !== "number" || !Number.isFinite(evaluatedPrice))
    ) {
      try {
        const bybitUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(
          order.symbol
        )}`;
        const res = await fetch(bybitUrl);
        if (res.ok) {
          const data = await res.json();
          const last = data?.result?.list?.[0]?.lastPrice;
          const price = Number(last);
          if (Number.isFinite(price)) evaluatedPrice = price;
        }
      } catch {}
    }

    const isPriceBasedReady =
      order.schedule_type === "price_based" &&
      typeof evaluatedPrice === "number" &&
      checkPriceTrigger(order, evaluatedPrice);

    const isReadyForExecution = isTimeBasedReady || isPriceBasedReady;

    console.log(
      `EXECUTION CHECK: ${isReadyForExecution} (Time: ${isTimeBasedReady}, Price: ${isPriceBasedReady})`
    );

    if (!isReadyForExecution) {
      // Revert status back to original if not ready
      await supabase
        .from("trading_room_scheduled_orders")
        .update({ status: order.status })
        .eq("id", orderId)
        .eq("status", "watching");

      return NextResponse.json(
        { error: "Order not ready for execution" },
        { status: 400 }
      );
    }

    // Execute the order based on type
    let executionResult;
    try {
      executionResult = await executeOrder(
        supabase,
        order,
        isPriceBasedReady
          ? (evaluatedPrice as number)
          : (current_price as number)
      );
      console.log(`EXECUTION SUCCESS: ${order.order_type} order created`);
    } catch (executionError) {
      console.log(`EXECUTION FAILED: ${executionError}`);
      // Revert status back to original on execution failure
      await supabase
        .from("trading_room_scheduled_orders")
        .update({ status: order.status })
        .eq("id", orderId)
        .eq("status", "watching");

      return NextResponse.json(
        { error: "Order execution failed" },
        { status: 500 }
      );
    }

    // Update order status to executed (only if currently watching)
    const { error: updateError } = await supabase
      .from("trading_room_scheduled_orders")
      .update({
        status: EXECUTION_STATUS_MAP.executed,
        executed_at: now.toISOString(),
        execution_price: executionResult.price,
      })
      .eq("id", orderId)
      .eq("status", "watching"); // Only update if still watching

    if (updateError) {
      console.log(`UPDATE ERROR: ${updateError.message}`);
      console.log(`UPDATE ERROR DETAILS:`, {
        orderId,
        currentStatus: "watching",
        targetStatus: EXECUTION_STATUS_MAP.executed,
        executionResult: executionResult.price,
      });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`ORDER EXECUTED SUCCESSFULLY: ${orderId}`);
    console.log(`STATUS UPDATED TO: ${EXECUTION_STATUS_MAP.executed}`);

    return NextResponse.json(
      { success: true, executionResult },
      { status: 200 }
    );
  } catch (error) {
    console.log(`EXECUTION ERROR: ${error}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function checkPriceTrigger(
  order: ScheduledOrder,
  currentPrice: number
): boolean {
  const triggerMap = {
    above: () => currentPrice >= (order.trigger_price || 0),
    below: () => currentPrice <= (order.trigger_price || 0),
  };

  const triggerCheck =
    triggerMap[order.trigger_condition as keyof typeof triggerMap];
  return triggerCheck ? triggerCheck() : false;
}

async function executeOrder(
  supabase: ReturnType<typeof createServiceClient> extends Promise<infer T>
    ? T
    : never,
  order: ScheduledOrder,
  currentPrice: number
) {
  const orderExecutionMap = {
    market: () => executeMarketOrder(supabase, order, currentPrice),
    limit: () => executeLimitOrder(supabase, order, currentPrice),
  };

  const executor =
    orderExecutionMap[order.order_type as keyof typeof orderExecutionMap];
  return executor
    ? executor()
    : Promise.reject(new Error("Invalid order type"));
}

async function executeMarketOrder(
  supabase: ReturnType<typeof createServiceClient> extends Promise<infer T>
    ? T
    : never,
  order: ScheduledOrder,
  currentPrice: number
) {
  // Get user_id from auth or use a default
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || order.user_id;

  if (!userId) {
    throw new Error("User ID not found");
  }

  // Map side to positions schema (long/short)
  const sideMap = {
    buy: "long",
    sell: "short",
  } as const;
  const mappedSide = sideMap[order.side as keyof typeof sideMap] || order.side;

  const notional = Number(currentPrice) * Number(order.quantity || 0);
  const leverage = Math.max(1, Number(order.leverage || 1));
  const initialMargin = notional / leverage;
  const FEE_RATE = 0.0005;
  const openFee = notional * FEE_RATE;
  const MMR = 0.005;
  const liquidationPrice = (() => {
    if (!Number.isFinite(currentPrice) || !Number.isFinite(leverage)) return 0;
    return mappedSide === "long"
      ? Number(currentPrice) * (1 - 1 / leverage + MMR)
      : Number(currentPrice) * (1 + 1 / leverage - MMR);
  })();

  // Calculate TP/SL values for RPC
  const hasValidTp =
    order.tp_enabled && order.take_profit_price && order.take_profit_price > 0;
  const hasValidSl =
    order.sl_enabled && order.stop_loss_price && order.stop_loss_price > 0;

  // Use RPC function for atomic position creation + balance deduction
  // This ensures both operations succeed or both fail, with built-in balance checks
  const { error: rpcError } = await supabase.rpc(
    "open_position_and_update_balance",
    {
      p_room_id: order.trading_room_id,
      p_user_id: userId,
      p_symbol: order.symbol,
      p_side: mappedSide,
      p_quantity: Number(order.quantity || 0),
      p_entry_price: Number(currentPrice),
      p_leverage: leverage,
      p_fee: openFee,
      p_initial_margin: initialMargin,
      p_liquidation_price: liquidationPrice,
      p_order_type: "market",
      p_status: "filled",
      p_tp_enabled: hasValidTp,
      p_sl_enabled: hasValidSl,
      p_take_profit_price: hasValidTp ? order.take_profit_price : null,
      p_stop_loss_price: hasValidSl ? order.stop_loss_price : null,
    }
  );

  if (rpcError) {
    throw new Error(
      `Market order failed: ${rpcError.message || "Failed to create position"}`
    );
  }

  // Query the created position to get its ID
  const { data: positionData, error: fetchErr } = await supabase
    .from("trading_room_positions")
    .select("id")
    .eq("room_id", order.trading_room_id)
    .eq("user_id", userId)
    .eq("symbol", order.symbol)
    .eq("side", mappedSide)
    .eq("entry_price", currentPrice)
    .eq("quantity", order.quantity)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchErr || !positionData) {
    throw new Error(
      `Position created but failed to retrieve: ${
        fetchErr?.message || "Unknown error"
      }`
    );
  }

  return { price: currentPrice, positionId: positionData.id };
}

async function executeLimitOrder(
  supabase: ReturnType<typeof createServiceClient> extends Promise<infer T>
    ? T
    : never,
  order: ScheduledOrder,
  currentPrice: number
) {
  // Get user_id from auth or use a default
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || order.user_id;

  if (!userId) {
    throw new Error("User ID not found");
  }

  // Convert side to match Open Orders table schema
  const sideMap = {
    buy: "long",
    sell: "short",
  };
  const mappedSide = sideMap[order.side as keyof typeof sideMap] || order.side;

  const { data, error } = await supabase
    .from("trading_room_open_orders")
    .insert({
      room_id: order.trading_room_id, // ✅ CORRECT COLUMN NAME
      user_id: userId,
      symbol: order.symbol,
      side: mappedSide, // ✅ CORRECT VALUES (long/short)
      order_type: "limit",
      limit_price: order.price, // ✅ CORRECT COLUMN NAME
      quantity: order.quantity,
      status: "open", // ✅ CORRECT STATUS VALUE
      time_in_force: "GTC",
      leverage: order.leverage,
      // ✅ ADD TP/SL FIELDS - ensure proper null handling for constraint
      tp_enabled: order.tp_enabled || false,
      sl_enabled: order.sl_enabled || false,
      take_profit_price:
        order.tp_enabled &&
        order.take_profit_price &&
        order.take_profit_price > 0
          ? order.take_profit_price
          : null,
      stop_loss_price:
        order.sl_enabled && order.stop_loss_price && order.stop_loss_price > 0
          ? order.stop_loss_price
          : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Limit order failed: ${error.message}`);
  }

  return { price: order.price, orderId: data.id };
}
