import { usePositions } from "@/hooks/use-positions";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import { createClient } from "@/lib/supabase/client";
import type { Symbol } from "@/types/market";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useTranslations } from "next-intl";
import { useOpenOrders } from "@/hooks/use-open-orders";
import { OpenOrdersTabs } from "./trading-tabs/open-orders-tabs";
import { OrderHistoryTabs } from "./trading-tabs/order-history-tabs";
import { PositionsTabs } from "./trading-tabs/positions-tabs";
import { ScheduledOrdersTabs } from "./trading-tabs/scheduled-orders-tabs";

// Memoized tab components to avoid re-renders when parent state changes
const MemoizedPositionsTabs = memo(PositionsTabs);
const MemoizedOpenOrdersTabs = memo(OpenOrdersTabs);
const MemoizedScheduledOrdersTabs = memo(ScheduledOrdersTabs);
const MemoizedOrderHistoryTabs = memo(OrderHistoryTabs);

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
  const [activeTab, setActiveTab] = useState("positions");
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [openOrdersCount, setOpenOrdersCount] = useState<number>(0);
  const [scheduledOrdersCount, setScheduledOrdersCount] = useState<number>(0);

  const ticker = useTickerData(symbol || "BTCUSDT");

  // Persist live price to prevent unnecessary re-renders
  const livePriceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      ticker?.lastPrice &&
      ticker.lastPrice !== "0" &&
      ticker.lastPrice !== ""
    ) {
      const parsed = parseFloat(String(ticker.lastPrice).replace(/,/g, ""));
      if (Number.isFinite(parsed) && parsed > 0) {
        livePriceRef.current = parsed;
      }
    }
  }, [ticker?.lastPrice]);

  const livePrice = livePriceRef.current;
  // Keep positions query active for tab count, but tab component will only render when active
  const { openPositions } = usePositions(roomId || "");

  // Keep open orders count in sync with the same query the table uses
  // Only fetch when tab is active to reduce load
  const openOrdersQuery = useOpenOrders(
    activeTab === "open-orders" && roomId ? roomId : "",
    {
    symbol: symbol as string,
    status: "open",
    }
  );

  useEffect(() => {
    if (activeTab === "open-orders") {
    const length = openOrdersQuery?.data?.data?.length || 0;
    setOpenOrdersCount(length);
    }
  }, [openOrdersQuery?.data?.data?.length, activeTab]);

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
        const { count } = await supabase
          .from("trading_room_scheduled_orders")
          .select("id", { count: "exact", head: true })
          .eq("trading_room_id", roomId)
          .eq("user_id", user.id);
        if (!cancelled && typeof count === "number") {
          setScheduledOrdersCount(count);
        }
      } catch {}
    };

    fetchScheduledCount();

    // Debounce realtime updates to prevent excessive queries
    let scheduledCountTimeout: NodeJS.Timeout | null = null;
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
          if (scheduledCountTimeout) {
            clearTimeout(scheduledCountTimeout);
          }
          scheduledCountTimeout = setTimeout(async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
              if (!user || cancelled) return;
              const { count } = await supabase
              .from("trading_room_scheduled_orders")
              .select("id", { count: "exact", head: true })
              .eq("trading_room_id", roomId)
              .eq("user_id", user.id);
            if (!cancelled && typeof count === "number") {
              setScheduledOrdersCount(count);
            }
            } catch {}
          }, 500);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (scheduledCountTimeout) {
        clearTimeout(scheduledCountTimeout);
      }
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

    // Debounce realtime updates to prevent excessive queries
    let historyCountTimeout: NodeJS.Timeout | null = null;
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
          if (historyCountTimeout) {
            clearTimeout(historyCountTimeout);
          }
          historyCountTimeout = setTimeout(async () => {
          try {
              if (cancelled) return;
            const { count } = await supabase
              .from("trading_room_positions")
              .select("id", { count: "exact", head: true })
              .eq("room_id", roomId)
              .not("closed_at", "is", null);
              if (!cancelled && typeof count === "number")
                setHistoryCount(count);
          } catch {}
          }, 500);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (historyCountTimeout) {
        clearTimeout(historyCountTimeout);
      }
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
        const { count } = await query;
        if (!cancelled && typeof count === "number") {
          setOpenOrdersCount(count);
        }
      } catch {}
    };

    fetchCountOnce();

    // Debounce realtime updates to prevent excessive queries
    let openOrdersCountTimeout: NodeJS.Timeout | null = null;
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

          if (openOrdersCountTimeout) {
            clearTimeout(openOrdersCountTimeout);
          }
          openOrdersCountTimeout = setTimeout(async () => {
          try {
              if (cancelled) return;
            let query = supabase
              .from("trading_room_open_orders")
              .select("id", { count: "exact", head: true })
              .eq("room_id", roomId)
              .eq("status", "open");
            if (symbol) query = query.eq("symbol", symbol as string);
              const { count } = await query;
            if (!cancelled && typeof count === "number") {
              setOpenOrdersCount(count);
            }
            } catch {}
          }, 500);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (openOrdersCountTimeout) {
        clearTimeout(openOrdersCountTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [roomId, symbol]);

  // Fallback: Use the same API as the table to get accurate count (debounced)
  const countUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const openOrdersCountRef = useRef(openOrdersCount);
  useEffect(() => {
    openOrdersCountRef.current = openOrdersCount;
  }, [openOrdersCount]);

  useEffect(() => {
    if (!roomId) return;

    if (countUpdateTimeoutRef.current) {
      clearTimeout(countUpdateTimeoutRef.current);
    }

    countUpdateTimeoutRef.current = setTimeout(async () => {
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
          if (actualCount !== openOrdersCountRef.current) {
            setOpenOrdersCount(actualCount);
          }
        }
      } catch {}
    }, 2000);

    return () => {
      if (countUpdateTimeoutRef.current) {
        clearTimeout(countUpdateTimeoutRef.current);
      }
    };
  }, [roomId, symbol]);

  // Fallback: Use the same API as the table to get accurate scheduled orders count (debounced)
  const scheduledCountUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledOrdersCountRef = useRef(scheduledOrdersCount);
  useEffect(() => {
    scheduledOrdersCountRef.current = scheduledOrdersCount;
  }, [scheduledOrdersCount]);

  useEffect(() => {
    if (!roomId) return;

    if (scheduledCountUpdateTimeoutRef.current) {
      clearTimeout(scheduledCountUpdateTimeoutRef.current);
    }

    scheduledCountUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/trading-room/${roomId}/scheduled-orders`
        );
        if (response.ok) {
          const data = await response.json();
          const actualCount = data?.data?.length || 0;
          if (actualCount !== scheduledOrdersCountRef.current) {
            setScheduledOrdersCount(actualCount);
          }
        }
      } catch {}
    }, 2000);

    return () => {
      if (scheduledCountUpdateTimeoutRef.current) {
        clearTimeout(scheduledCountUpdateTimeoutRef.current);
      }
    };
  }, [roomId]);

  // Tabs are rendered outside react-grid-layout; keep events simple

  const handleTabChange = useCallback((tabId: string) => {
    // Immediate update for instant visual feedback
    setActiveTab(tabId);
  }, []);

  const positionsCount = useMemo(
    () => openPositions?.length || 0,
    [openPositions?.length]
  );

  const tabs = useMemo(
    () => [
    {
      id: "positions",
        label: t("positions", { count: positionsCount }),
    },
    { id: "open-orders", label: t("openOrders", { count: openOrdersCount }) },
    {
      id: "scheduled-orders",
      label: t("scheduledOrders", { count: scheduledOrdersCount }),
    },
    { id: "order-history", label: t("history", { count: historyCount }) },
    ],
    [t, positionsCount, openOrdersCount, scheduledOrdersCount, historyCount]
  );

  return (
    <div
      className="border border-border bg-background rounded-none text-sm w-full h-full flex flex-col"
      data-grid-no-drag="true"
      style={{ touchAction: "pan-y" }}
    >
      {/* Desktop Tab Navigation */}
      <div className="hidden lg:block">
        <div className="flex items-center overflow-x-auto scrollbar-hide border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
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
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 cursor-pointer shrink-0 transition-colors ${
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
                  t("mobile.positions", { count: positionsCount })}
                {tab.id === "order-history" &&
                  t("mobile.history", { count: historyCount })}
              </span>
              {/* Desktop: Show full labels */}
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden" data-grid-no-drag="true">
        {/* Lazy load tabs - only render active tab for better performance */}
                {activeTab === "open-orders" && (
          <div className="h-full" data-grid-no-drag="true">
                        <MemoizedOpenOrdersTabs symbol={symbol} roomId={roomId || ""} />
        </div>
        )}
                {activeTab === "scheduled-orders" && (
          <div className="h-full" data-grid-no-drag="true">
                        <MemoizedScheduledOrdersTabs roomId={roomId as string} />
        </div>
        )}
                {activeTab === "positions" && (
          <div className="h-full" data-grid-no-drag="true">
                        <MemoizedPositionsTabs
            roomId={roomId as string}
            symbol={symbol}
            livePriceOverride={livePrice}
          />
        </div>
        )}
                {activeTab === "order-history" && (
          <div className="h-full" data-grid-no-drag="true">
                        <MemoizedOrderHistoryTabs
            symbol={symbol}
            roomId={roomId}
            onCountChange={(n) => setHistoryCount(n)}
          />
        </div>
        )}
      </div>
    </div>
  );
}
