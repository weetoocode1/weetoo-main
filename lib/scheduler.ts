import cron from "node-cron";
import { createServiceClient } from "@/lib/supabase/server";
import { syncAllStreamStatuses } from "@/lib/mux-stream-sync";

// Types for scheduled orders
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
  current_price?: number;
  status: string;
  tp_enabled?: boolean;
  sl_enabled?: boolean;
  take_profit_price?: number;
  stop_loss_price?: number;
}

interface TpSlOrder {
  id: string;
  position_id: string;
  trading_room_id: string;
  user_id: string;
  order_type: string;
  side: string;
  quantity: number;
  trigger_price: number;
  order_price?: number;
  status: string;
}

interface BybitTickerResponse {
  result?: {
    list?: Array<{
      lastPrice?: string;
    }>;
  };
}

// Prevent double-starts when modules hot-reload in dev
const globalAny = globalThis as unknown as { __schedulerStarted?: boolean };

// Enable scheduler for localhost testing or production
const shouldRunScheduler =
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_SCHEDULER === "true" ||
  process.env.NODE_ENV === "development";

if (shouldRunScheduler && !globalAny.__schedulerStarted) {
  globalAny.__schedulerStarted = true;
  console.log("🚀 Starting scheduled order execution engine...");

  // Run every 30 seconds to check for scheduled orders
  cron.schedule(
    "*/30 * * * * *",
    async () => {
      try {
        console.log(
          "⏰ Checking scheduled orders at:",
          new Date().toISOString()
        );

        const supabase = await createServiceClient();

        // Query time-based orders due now
        const nowIso = new Date().toISOString();
        const { data: dueTimeBased, error: timeError } = await supabase
          .from("trading_room_scheduled_orders")
          .select("*")
          .eq("status", "pending")
          .lte("scheduled_at", nowIso);

        if (timeError) {
          console.error(
            "❌ Error fetching time-based scheduled orders:",
            timeError
          );
          return;
        }
        console.log("🔎 Checking scheduled time-based orders at:", nowIso);
        if (!dueTimeBased || dueTimeBased.length === 0) {
          console.log("🕒 No time-based orders ready for execution");
        } else {
          console.log(`🕒 Time-based orders ready: ${dueTimeBased.length}`);
        }

        // Query price-based watching orders (engine decides if price met)
        const { data: watchingPriceBased, error: watchError } = await supabase
          .from("trading_room_scheduled_orders")
          .select("*")
          .eq("status", "watching");

        if (watchError) {
          console.error(
            "❌ Error fetching price-based scheduled orders:",
            watchError
          );
          return;
        }

        // ===== Price-based readiness evaluation and logging =====
        console.log("🔎 Checking scheduled price-based orders at:", nowIso);
        let readyPriceBased: ScheduledOrder[] = [];
        if (!watchingPriceBased || watchingPriceBased.length === 0) {
          console.log("📉 No price-based orders ready for execution");
        } else {
          const priceBased = (watchingPriceBased || []).filter(
            (o: ScheduledOrder) =>
              o?.symbol && o?.trigger_price && o?.trigger_condition
          );
          const symbols = Array.from(
            new Set(priceBased.map((o: ScheduledOrder) => o.symbol))
          );

          const getSymbolPrice = async (
            symbol: string
          ): Promise<number | null> => {
            try {
              const url = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(
                symbol
              )}`;
              const res = await fetch(url, { cache: "no-store" });
              const json: BybitTickerResponse = await res.json();
              const p = Number(json?.result?.list?.[0]?.lastPrice);
              return Number.isFinite(p) ? p : null;
            } catch {
              return null;
            }
          };

          const priceMap: Record<string, number | null> = {};
          await Promise.all(
            symbols.map(async (s) => {
              priceMap[s] = await getSymbolPrice(s);
            })
          );

          readyPriceBased = (watchingPriceBased || []).filter(
            (order: ScheduledOrder) => {
              const currentPrice = priceMap[order.symbol] ?? null;
              const triggerPrice = Number(order.trigger_price);
              const cond = String(order.trigger_condition);
              return (
                currentPrice != null &&
                (cond === "above"
                  ? currentPrice >= triggerPrice
                  : currentPrice <= triggerPrice)
              );
            }
          );

          if (readyPriceBased.length === 0) {
            console.log("📉 No price-based orders ready for execution");
          } else {
            console.log(
              `📈 Price-based orders ready: ${readyPriceBased.length}`
            );
          }
        }

        const scheduledOrders = [...(dueTimeBased || []), ...readyPriceBased];

        if (scheduledOrders.length === 0) {
          console.log("✅ No scheduled orders ready for execution");
          return;
        }

        console.log(
          `📋 Found ${scheduledOrders.length} scheduled orders ready for execution`
        );

        // Execute each scheduled order
        for (const order of scheduledOrders) {
          try {
            console.log(`🔄 Executing scheduled order ${order.id}...`);

            const response = await fetch(
              `${
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
              }/api/trading-room/${order.trading_room_id}/scheduled-orders/${
                order.id
              }/execute`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-exec-secret":
                    process.env.EXECUTE_SECRET || "default-secret",
                },
                body: JSON.stringify({
                  current_price: null,
                }),
              }
            );

            if (response.ok) {
              const result = await response.json();
              console.log(
                `✅ Scheduled order ${order.id} executed successfully:`,
                result
              );
            } else {
              const errorText = await response.text();
              console.error(
                `❌ Failed to execute scheduled order ${order.id}:`,
                errorText
              );
            }
          } catch (orderError) {
            console.error(
              `❌ Error executing scheduled order ${order.id}:`,
              orderError
            );
          }
        }

        // ===== CHECK TP/SL ORDERS FOR EXECUTION =====
        console.log("🔍 Checking TP/SL orders for execution...");
        console.log("📋 TP/SL monitoring section started");
        console.log("🔧 About to query TP/SL orders from database...");
        console.log("⏰ Current time:", new Date().toISOString());

        // First, let's check if there are any TP/SL orders at all (regardless of status)
        const { data: allTpSlOrders, error: allTpSlError } = await supabase
          .from("trading_room_tp_sl_orders")
          .select("id, status, order_type, trigger_price")
          .limit(10);

        console.log("🔍 All TP/SL orders check:");
        console.log("📊 All TP/SL error:", allTpSlError);
        console.log("📊 All TP/SL count:", allTpSlOrders?.length || 0);
        if (allTpSlOrders && allTpSlOrders.length > 0) {
          console.log("📊 Sample TP/SL orders:", allTpSlOrders);
        }

        // Get all active TP/SL orders
        const { data: activeTpSlOrders, error: tpSlError } = await supabase
          .from("trading_room_tp_sl_orders")
          .select(
            `
            *,
            trading_room_positions!inner(symbol)
          `
          )
          .eq("status", "active");

        console.log("🔍 TP/SL query completed");
        console.log("📊 Query error:", tpSlError);
        console.log("📊 Query result:", activeTpSlOrders);

        if (tpSlError) {
          console.error("❌ Error fetching active TP/SL orders:", tpSlError);
        } else {
          console.log(
            `📊 TP/SL query result: ${
              activeTpSlOrders?.length || 0
            } orders found`
          );
          if (activeTpSlOrders && activeTpSlOrders.length > 0) {
            console.log(
              `📊 Found ${activeTpSlOrders.length} active TP/SL orders`
            );

            // Log TP/SL order details
            activeTpSlOrders.forEach(
              (
                order: TpSlOrder & {
                  trading_room_positions: { symbol: string };
                }
              ) => {
                const symbol = order.trading_room_positions.symbol;
                const orderType =
                  order.order_type === "take_profit" ? "TP" : "SL";
                const side = order.side === "long" ? "Long" : "Short";
                console.log(
                  `📈 ${orderType} Order: ${symbol} ${side} @ ${
                    order.trigger_price
                  } (ID: ${order.id.slice(0, 8)})`
                );
              }
            );

            // Group orders by symbol for efficient price checking
            const ordersBySymbol = activeTpSlOrders.reduce(
              (
                acc: Record<
                  string,
                  (TpSlOrder & { trading_room_positions: { symbol: string } })[]
                >,
                order: TpSlOrder & {
                  trading_room_positions: { symbol: string };
                }
              ) => {
                const symbol = order.trading_room_positions.symbol;
                if (!acc[symbol]) acc[symbol] = [];
                acc[symbol].push(order);
                return acc;
              },
              {}
            );

            // Check each symbol's orders
            for (const [symbol, orders] of Object.entries(ordersBySymbol)) {
              try {
                console.log(`💰 Checking prices for ${symbol}...`);

                // Get current price for symbol
                const url = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(
                  symbol
                )}`;
                const res = await fetch(url, { cache: "no-store" });
                const json: BybitTickerResponse = await res.json();
                const currentPrice = Number(json?.result?.list?.[0]?.lastPrice);

                if (!Number.isFinite(currentPrice)) {
                  console.warn(`⚠️ Could not get price for ${symbol}`);
                  continue;
                }

                console.log(
                  `📊 ${symbol} current price: $${currentPrice.toFixed(2)}`
                );

                // Check which orders should trigger
                const ordersToExecute = (
                  orders as (TpSlOrder & {
                    trading_room_positions: { symbol: string };
                  })[]
                ).filter(
                  (
                    order: TpSlOrder & {
                      trading_room_positions: { symbol: string };
                    }
                  ) => {
                    const triggerPrice = Number(order.trigger_price);
                    const orderType = order.order_type;
                    const side = order.side;
                    const orderTypeLabel =
                      orderType === "take_profit" ? "TP" : "SL";
                    const sideLabel = side === "long" ? "Long" : "Short";

                    // TP/SL logic based on order type and side
                    let shouldTrigger = false;
                    if (orderType === "take_profit") {
                      if (side === "long") {
                        shouldTrigger = currentPrice >= triggerPrice; // Long TP: price goes up
                      } else {
                        shouldTrigger = currentPrice <= triggerPrice; // Short TP: price goes down
                      }
                    } else if (orderType === "stop_loss") {
                      if (side === "long") {
                        shouldTrigger = currentPrice <= triggerPrice; // Long SL: price goes down
                      } else {
                        shouldTrigger = currentPrice >= triggerPrice; // Short SL: price goes up
                      }
                    }

                    // Log trigger check
                    const status = shouldTrigger
                      ? "🎯 TRIGGERED"
                      : "⏳ Waiting";
                    console.log(
                      `${status} ${orderTypeLabel} ${sideLabel}: Current $${currentPrice.toFixed(
                        2
                      )} vs Trigger $${triggerPrice.toFixed(2)}`
                    );

                    return shouldTrigger;
                  }
                );

                // Log execution summary
                if (ordersToExecute.length > 0) {
                  console.log(
                    `🚀 Executing ${ordersToExecute.length} triggered TP/SL orders for ${symbol}`
                  );
                } else {
                  console.log(`✅ No TP/SL orders triggered for ${symbol}`);
                }

                // Execute triggered orders
                for (const order of ordersToExecute) {
                  try {
                    const orderTypeLabel =
                      order.order_type === "take_profit" ? "TP" : "SL";
                    const sideLabel = order.side === "long" ? "Long" : "Short";
                    console.log(
                      `🔄 Executing ${orderTypeLabel} ${sideLabel} order ${order.id.slice(
                        0,
                        8
                      )}...`
                    );

                    const response = await fetch(
                      `${
                        process.env.NEXT_PUBLIC_SITE_URL ||
                        "http://localhost:3000"
                      }/api/trading-room/${
                        order.trading_room_id
                      }/tp-sl-orders/${order.id}`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-exec-secret":
                            process.env.EXECUTE_SECRET || "default-secret",
                        },
                        body: JSON.stringify({
                          current_price: currentPrice,
                        }),
                      }
                    );

                    if (response.ok) {
                      // const result = await response.json();
                      console.log(
                        `✅ ${orderTypeLabel} ${sideLabel} order ${order.id.slice(
                          0,
                          8
                        )} executed successfully!`
                      );
                    } else {
                      const errorText = await response.text();
                      console.error(
                        `❌ Failed to execute ${orderTypeLabel} ${sideLabel} order ${order.id.slice(
                          0,
                          8
                        )}:`,
                        errorText
                      );
                    }
                  } catch (tpSlOrderError) {
                    console.error(
                      `❌ Error executing TP/SL order ${order.id}:`,
                      tpSlOrderError
                    );
                  }
                }
              } catch (symbolError) {
                console.error(
                  `❌ Error processing symbol ${symbol}:`,
                  symbolError
                );
              }
            }
          } else {
            console.log("📊 No active TP/SL orders found");
          }
        }

        console.log("✅ TP/SL monitoring complete");
      } catch (error) {
        console.error("❌ Error in scheduled order execution:", error);
      }
    },
    {
      timezone: "UTC",
    }
  );

  cron.schedule(
    "*/3 * * * * *",
    async () => {
      try {
        await syncAllStreamStatuses();
      } catch (error) {
        console.error("❌ Error syncing Mux stream statuses:", error);
      }
    },
    {
      timezone: "UTC",
    }
  );

  console.log("✅ Scheduled order execution engine started successfully");
  console.log("✅ Mux stream status sync started (every 3 seconds)");
} else {
  console.log("⚠️ Scheduled order execution engine disabled");
}

export default cron;
