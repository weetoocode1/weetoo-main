import { usePositions } from "@/hooks/use-positions";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import { createClient } from "@/lib/supabase/client";
import type { Symbol } from "@/types/market";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useOpenOrders } from "@/hooks/use-open-orders";
import { OpenOrdersTabs } from "./trading-tabs/open-orders-tabs";
import { OrderHistoryTabs } from "./trading-tabs/order-history-tabs";
import { PositionsTabs } from "./trading-tabs/positions-tabs";
import { ScheduledOrdersTabs } from "./trading-tabs/scheduled-orders-tabs";

interface TradingTabsProps {
  symbol?: Symbol;
  roomId?: string;
}

interface RealtimePayload {
  old?: {
    status?: string;
    symbol?: string;
  };
  new?: {
    status?: string;
    symbol?: string;
  };
  eventType?: string;
}

export function TradingTabs({ symbol, roomId }: TradingTabsProps) {
  const t = useTranslations("trading.tabs");
  const [activeTab, setActiveTab] = useState("open-orders");
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [openOrdersCount, setOpenOrdersCount] = useState<number>(0);
  const [scheduledOrdersCount, setScheduledOrdersCount] = useState<number>(0);

  const ticker = useTickerData(symbol || "BTCUSDT");
  const livePrice = ticker?.lastPrice
    ? parseFloat(String(ticker.lastPrice).replace(/,/g, ""))
    : undefined;
  const { openPositions } = usePositions(roomId || "");

  // Keep open orders count in sync with the same query the table uses
  const openOrdersQuery = useOpenOrders(roomId || "", {
    symbol: symbol as string,
    status: "open",
  });

  useEffect(() => {
    const length = openOrdersQuery?.data?.data?.length || 0;
    setOpenOrdersCount(length);
  }, [openOrdersQuery?.data?.data?.length]);

  // Prefetch scheduled orders count (all statuses) so label is correct immediately
  useEffect(() => {
    let cancelled = false;
    if (!roomId) return;

    const supabase = createClient();

    const fetchScheduledCount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { count, error } = await supabase
          .from("trading_room_scheduled_orders")
          .select("id", { count: "exact", head: true })
          .eq("trading_room_id", roomId)
          .eq("user_id", user.id);
        console.log("🔍 Scheduled Count Query Debug:", {
          roomId,
          count,
          error,
          userId: user.id,
        });
        if (!cancelled && typeof count === "number") {
          console.log("✅ Setting scheduled count to:", count);
          setScheduledOrdersCount(count);
        }
      } catch (err) {
        console.error("❌ Scheduled count query error:", err);
      }
    };

    fetchScheduledCount();

    const channel = supabase
      .channel(`scheduled-orders-count-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_scheduled_orders",
          filter: `trading_room_id=eq.${roomId}`,
        },
        async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            const { count, error } = await supabase
              .from("trading_room_scheduled_orders")
              .select("id", { count: "exact", head: true })
              .eq("trading_room_id", roomId)
              .eq("user_id", user.id);
            console.log("🔄 Realtime Scheduled Count Update:", {
              roomId,
              count,
              error,
              userId: user.id,
            });
            if (!cancelled && typeof count === "number") {
              console.log("✅ Realtime setting scheduled count to:", count);
              setScheduledOrdersCount(count);
            }
          } catch (err) {
            console.error("❌ Realtime scheduled count error:", err);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Prefetch history count (closed positions) so label is correct immediately
  useEffect(() => {
    let cancelled = false;
    if (!roomId) return;

    const supabase = createClient();

    const fetchHistoryCount = async () => {
      try {
        const { count } = await supabase
          .from("trading_room_positions")
          .select("id", { count: "exact", head: true })
          .eq("room_id", roomId)
          .not("closed_at", "is", null);
        if (!cancelled && typeof count === "number") setHistoryCount(count);
      } catch {}
    };

    fetchHistoryCount();

    const channel = supabase
      .channel(`history-count-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_positions",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          try {
            const { count } = await supabase
              .from("trading_room_positions")
              .select("id", { count: "exact", head: true })
              .eq("room_id", roomId)
              .not("closed_at", "is", null);
            if (!cancelled && typeof count === "number") setHistoryCount(count);
          } catch {}
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    if (!roomId) return;

    const supabase = createClient();

    const fetchCountOnce = async () => {
      try {
        let query = supabase
          .from("trading_room_open_orders")
          .select("id", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("status", "open");
        if (symbol) query = query.eq("symbol", symbol as string);
        const { count, error } = await query;
        console.log("🔍 Count Query Debug:", {
          roomId,
          symbol,
          count,
          error,
          queryString: query.toString(),
        });
        if (!cancelled && typeof count === "number") {
          console.log("✅ Setting count to:", count);
          setOpenOrdersCount(count);
        }
      } catch (err) {
        console.error("❌ Count query error:", err);
      }
    };

    fetchCountOnce();

    const channel = supabase
      .channel(`open-orders-count-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_open_orders",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePayload) => {
          const affectsCount = () => {
            const before = payload?.old;
            const after = payload?.new;
            const wasOpen = before?.status === "open";
            const isOpen = after?.status === "open";
            const symbolMatches = (val: string | undefined) =>
              !symbol || String(val) === String(symbol);

            const eventMap = {
              INSERT: () => isOpen && symbolMatches(after?.symbol),
              DELETE: () => wasOpen && symbolMatches(before?.symbol),
              UPDATE: () => {
                const symbolChanged = before?.symbol !== after?.symbol;
                const statusChanged = before?.status !== after?.status;
                if (!symbol && statusChanged) return true;
                if (symbolChanged || statusChanged) return true;
                return false;
              },
            };

            const eventHandler =
              eventMap[payload.eventType as keyof typeof eventMap];
            return eventHandler ? eventHandler() : false;
          };

          if (!affectsCount()) return;

          try {
            let query = supabase
              .from("trading_room_open_orders")
              .select("id", { count: "exact", head: true })
              .eq("room_id", roomId)
              .eq("status", "open");
            if (symbol) query = query.eq("symbol", symbol as string);
            const { count, error } = await query;
            console.log("🔄 Realtime Count Update:", {
              roomId,
              symbol,
              count,
              error,
              payload,
            });
            if (!cancelled && typeof count === "number") {
              console.log("✅ Realtime setting count to:", count);
              setOpenOrdersCount(count);
            }
          } catch (err) {
            console.error("❌ Realtime count error:", err);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, symbol]);

  // Fallback: Use the same API as the table to get accurate count
  useEffect(() => {
    if (!roomId) return;

    const fetchCountFromAPI = async () => {
      try {
        const params = new URLSearchParams();
        params.append("status", "open");
        if (symbol) params.append("symbol", symbol as string);

        const response = await fetch(
          `/api/trading-room/${roomId}/open-orders?${params}`
        );
        if (response.ok) {
          const data = await response.json();
          const actualCount = data?.data?.length || 0;
          console.log("🔄 Open Orders API Fallback Count:", {
            roomId,
            symbol,
            actualCount,
            dataLength: data?.data?.length,
            currentCount: openOrdersCount,
          });
          if (actualCount !== openOrdersCount) {
            console.log(
              "✅ Open Orders API fallback updating count from",
              openOrdersCount,
              "to",
              actualCount
            );
            setOpenOrdersCount(actualCount);
          }
        }
      } catch (err) {
        console.error("❌ Open Orders API fallback error:", err);
      }
    };

    // Run after a short delay to let Supabase query complete first
    const timeoutId = setTimeout(fetchCountFromAPI, 2000);
    return () => clearTimeout(timeoutId);
  }, [roomId, symbol, openOrdersCount]);

  // Fallback: Use the same API as the table to get accurate scheduled orders count
  useEffect(() => {
    if (!roomId) return;

    const fetchScheduledCountFromAPI = async () => {
      try {
        const response = await fetch(
          `/api/trading-room/${roomId}/scheduled-orders`
        );
        if (response.ok) {
          const data = await response.json();
          const actualCount = data?.data?.length || 0;
          console.log("🔄 Scheduled Orders API Fallback Count:", {
            roomId,
            actualCount,
            dataLength: data?.data?.length,
            currentCount: scheduledOrdersCount,
          });
          if (actualCount !== scheduledOrdersCount) {
            console.log(
              "✅ Scheduled Orders API fallback updating count from",
              scheduledOrdersCount,
              "to",
              actualCount
            );
            setScheduledOrdersCount(actualCount);
          }
        }
      } catch (err) {
        console.error("❌ Scheduled Orders API fallback error:", err);
      }
    };

    // Run after a short delay to let Supabase query complete first
    const timeoutId = setTimeout(fetchScheduledCountFromAPI, 2000);
    return () => clearTimeout(timeoutId);
  }, [roomId, scheduledOrdersCount]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const tabs = [
    {
      id: "positions",
      label: t("positions", {
        count: openPositions ? openPositions.length : 0,
      }),
    },
    { id: "open-orders", label: t("openOrders", { count: openOrdersCount }) },
    {
      id: "scheduled-orders",
      label: t("scheduledOrders", { count: scheduledOrdersCount }),
    },

    { id: "order-history", label: t("history", { count: historyCount }) },
  ];

  return (
    <div className="border border-border bg-background rounded-none text-sm w-full h-full flex flex-col">
      {/* Desktop Tab Navigation */}
      <div className="hidden lg:block">
        <div className="flex items-center overflow-x-auto scrollbar-hide border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={handleMouseDown}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "text-foreground border-primary bg-primary/5"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile/Tablet Tab Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center overflow-x-auto scrollbar-hide border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={handleMouseDown}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors duration-200 border-b-2 cursor-pointer flex-shrink-0 ${
                activeTab === tab.id
                  ? "text-foreground border-primary bg-primary/5"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {/* Mobile: Show abbreviated labels */}
              <span className="lg:hidden">
                {tab.id === "open-orders" &&
                  t("mobile.orders", { count: openOrdersCount })}
                {tab.id === "scheduled-orders" &&
                  t("mobile.scheduled", { count: scheduledOrdersCount })}
                {tab.id === "positions" &&
                  t("mobile.positions", {
                    count: openPositions ? openPositions.length : 0,
                  })}
                {tab.id === "order-history" &&
                  t("mobile.history", { count: historyCount })}
              </span>
              {/* Desktop: Show full labels */}
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Pre-mount all tabs to ensure realtime subscriptions are always active */}
        <div
          className={`h-full ${
            activeTab === "open-orders" ? "block" : "hidden"
          }`}
        >
          <OpenOrdersTabs symbol={symbol} roomId={roomId || ""} />
        </div>
        <div
          className={`h-full ${
            activeTab === "scheduled-orders" ? "block" : "hidden"
          }`}
        >
          <ScheduledOrdersTabs roomId={roomId as string} />
        </div>
        <div
          className={`h-full ${activeTab === "positions" ? "block" : "hidden"}`}
        >
          <PositionsTabs
            roomId={roomId as string}
            symbol={symbol}
            livePriceOverride={livePrice}
          />
        </div>
        <div
          className={`h-full ${
            activeTab === "order-history" ? "block" : "hidden"
          }`}
        >
          <OrderHistoryTabs
            symbol={symbol}
            roomId={roomId}
            onCountChange={(n) => setHistoryCount(n)}
          />
        </div>
      </div>
    </div>
  );
}
