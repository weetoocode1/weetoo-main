import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const SCHEDULE_TYPE_MAP = {
  time_based: "time_based",
  price_based: "price_based",
} as const;

const ORDER_TYPE_MAP = {
  market: "market",
  limit: "limit",
} as const;

const SIDE_MAP = {
  buy: "buy",
  sell: "sell",
} as const;

const STATUS_MAP = {
  pending: "pending",
  watching: "watching",
  executed: "executed",
  cancelled: "cancelled",
  failed: "failed",
} as const;

const TRIGGER_CONDITION_MAP = {
  above: "above",
  below: "below",
} as const;

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

interface ExecutionBody {
  current_price?: number;
  client_time?: string;
}

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
      symbol,
      side,
      order_type,
      quantity,
      price,
      leverage,
      schedule_type,
      scheduled_at,
      trigger_condition,
      trigger_price,
      current_price,
      // ✅ ADD TP/SL FIELDS
      tp_enabled,
      sl_enabled,
      take_profit_price,
      stop_loss_price,
    } = body;

    const validationErrors = validateScheduledOrderData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ errors: validationErrors }, { status: 400 });
    }

    const orderData = {
      trading_room_id: tradingRoomId,
      user_id: user.id,
      symbol,
      side: SIDE_MAP[side as keyof typeof SIDE_MAP],
      order_type: ORDER_TYPE_MAP[order_type as keyof typeof ORDER_TYPE_MAP],
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      leverage: parseInt(leverage),
      schedule_type:
        SCHEDULE_TYPE_MAP[schedule_type as keyof typeof SCHEDULE_TYPE_MAP],
      scheduled_at: scheduled_at || null,
      trigger_condition: trigger_condition
        ? TRIGGER_CONDITION_MAP[
            trigger_condition as keyof typeof TRIGGER_CONDITION_MAP
          ]
        : null,
      trigger_price: trigger_price ? parseFloat(trigger_price) : null,
      current_price: current_price ? parseFloat(current_price) : null,
      status:
        schedule_type === "price_based"
          ? STATUS_MAP.watching
          : STATUS_MAP.pending,
      // ✅ ADD TP/SL FIELDS
      tp_enabled: tp_enabled || false,
      sl_enabled: sl_enabled || false,
      take_profit_price: take_profit_price
        ? parseFloat(take_profit_price)
        : null,
      stop_loss_price: stop_loss_price ? parseFloat(stop_loss_price) : null,
    };

    const { data, error } = await supabase
      .from("trading_room_scheduled_orders")
      .insert(orderData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (_e) {
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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("trading_room_scheduled_orders")
      .select("*")
      .eq("trading_room_id", tradingRoomId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const statusFilter = status
      ? STATUS_MAP[status as keyof typeof STATUS_MAP]
      : null;
    query = statusFilter ? query.eq("status", statusFilter) : query;

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count }, { status: 200 });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string; orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const actionMap = {
      cancel: () => cancelScheduledOrder(supabase, orderId, user.id),
      execute: () => executeScheduledOrder(supabase, orderId, user.id, body),
    };

    const actionHandler = actionMap[action as keyof typeof actionMap];
    if (!actionHandler) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await actionHandler();
    return NextResponse.json(result, { status: 200 });
  } catch (_e) {
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
    const { orderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("trading_room_scheduled_orders")
      .delete()
      .eq("id", orderId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (_e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function validateScheduledOrderData(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const requiredFields = [
    "symbol",
    "side",
    "order_type",
    "quantity",
    "leverage",
    "schedule_type",
  ];
  requiredFields.forEach((field) => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  const validScheduleTypes = Object.keys(SCHEDULE_TYPE_MAP);
  const validOrderTypes = Object.keys(ORDER_TYPE_MAP);
  const validSides = Object.keys(SIDE_MAP);
  // const validTriggerConditions = Object.keys(TRIGGER_CONDITION_MAP);

  if (!validScheduleTypes.includes(String(data.schedule_type))) {
    errors.push("Invalid schedule_type");
  }
  if (!validOrderTypes.includes(String(data.order_type))) {
    errors.push("Invalid order_type");
  }
  if (!validSides.includes(String(data.side))) {
    errors.push("Invalid side");
  }

  if (data.schedule_type === "time_based" && !data.scheduled_at) {
    errors.push("scheduled_at is required for time_based orders");
  }
  if (
    data.schedule_type === "price_based" &&
    (!data.trigger_condition || !data.trigger_price || !data.current_price)
  ) {
    errors.push(
      "trigger_condition, trigger_price, and current_price are required for price_based orders"
    );
  }
  if (data.order_type === "limit" && !data.price) {
    errors.push("price is required for limit orders");
  }

  if (Number(data.quantity) <= 0) {
    errors.push("quantity must be greater than 0");
  }
  if (Number(data.leverage) < 1) {
    errors.push("leverage must be at least 1");
  }
  if (Number(data.leverage) > 125) {
    errors.push("leverage cannot exceed 125");
  }

  return errors;
}

async function cancelScheduledOrder(
  supabase: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
  orderId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("trading_room_scheduled_orders")
    .update({ status: STATUS_MAP.cancelled })
    .eq("id", orderId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { data };
}

async function executeScheduledOrder(
  supabase: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
  orderId: string,
  userId: string,
  body: ExecutionBody
) {
  const { data: order, error: fetchError } = await supabase
    .from("trading_room_scheduled_orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("status", STATUS_MAP.pending)
    .single();

  if (fetchError || !order) {
    throw new Error("Order not found or not ready for execution");
  }

  const now = new Date();
  const scheduledTime = new Date(order.scheduled_at);

  const isTimeBasedReady =
    order.schedule_type === "time_based" && scheduledTime <= now;
  const isPriceBasedReady =
    order.schedule_type === "price_based" &&
    checkPriceTrigger(order, body.current_price || 0);

  const isReadyForExecution = isTimeBasedReady || isPriceBasedReady;

  if (!isReadyForExecution) {
    throw new Error("Order not ready for execution");
  }

  const executionResult = await executeOrder(supabase, order);

  const { error: updateError } = await supabase
    .from("trading_room_scheduled_orders")
    .update({
      status: STATUS_MAP.executed,
      executed_at: now.toISOString(),
      execution_price: executionResult.price,
    })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { success: true, executionResult };
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
  supabase: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
  order: ScheduledOrder
) {
  const orderExecutionMap = {
    market: () => executeMarketOrder(supabase, order),
    limit: () => executeLimitOrder(supabase, order),
  };

  const executor =
    orderExecutionMap[order.order_type as keyof typeof orderExecutionMap];
  return executor
    ? executor()
    : Promise.reject(new Error("Invalid order type"));
}

async function executeMarketOrder(
  supabase: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
  order: ScheduledOrder
) {
  const { data: tickerData } = await supabase
    .from("trading_room_tickers")
    .select("price")
    .eq("symbol", order.symbol)
    .single();

  const currentPrice = tickerData?.price || 0;

  const { data, error } = await supabase
    .from("trading_room_positions")
    .insert({
      trading_room_id: order.trading_room_id,
      user_id: order.user_id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      entry_price: currentPrice,
      leverage: order.leverage,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { price: currentPrice, positionId: data.id };
}

async function executeLimitOrder(
  supabase: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
  order: ScheduledOrder
) {
  const { data, error } = await supabase
    .from("trading_room_open_orders")
    .insert({
      trading_room_id: order.trading_room_id,
      user_id: order.user_id,
      symbol: order.symbol,
      side: order.side,
      order_type: "limit",
      quantity: order.quantity,
      price: order.price,
      leverage: order.leverage,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { price: order.price, orderId: data.id };
}
