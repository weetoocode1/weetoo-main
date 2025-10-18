import { usePositions } from "@/hooks/use-positions";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import { createClient } from "@/lib/supabase/client";
import type { Symbol } from "@/types/market";
import { useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState("open-orders");
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [openOrdersCount, setOpenOrdersCount] = useState<number>(0);
  const [scheduledOrdersCount, setScheduledOrdersCount] = useState<number>(0);

  const ticker = useTickerData(symbol || "BTCUSDT");
  const livePrice = ticker?.lastPrice
    ? parseFloat(String(ticker.lastPrice).replace(/,/g, ""))
    : undefined;
  const { openPositions } = usePositions(roomId || "");

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
        if (!cancelled && typeof count === "number")
          setScheduledOrdersCount(count);
      } catch {}
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
            const { count } = await supabase
              .from("trading_room_scheduled_orders")
              .select("id", { count: "exact", head: true })
              .eq("trading_room_id", roomId)
              .eq("user_id", user.id);
            if (!cancelled && typeof count === "number")
              setScheduledOrdersCount(count);
          } catch {}
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
        const { count } = await query;
        if (!cancelled && typeof count === "number") setOpenOrdersCount(count);
      } catch {}
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
            const { count } = await query;
            if (!cancelled && typeof count === "number")
              setOpenOrdersCount(count);
          } catch {}
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, symbol]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const tabs = [
    { id: "open-orders", label: `Open Orders (${openOrdersCount})` },
    {
      id: "scheduled-orders",
      label: `Scheduled Orders (${scheduledOrdersCount})`,
    },
    {
      id: "positions",
      label: `Positions (${openPositions ? openPositions.length : 0})`,
    },
    { id: "order-history", label: `History (${historyCount})` },
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
                {tab.id === "open-orders" && `Orders (${openOrdersCount})`}
                {tab.id === "scheduled-orders" &&
                  `Scheduled (${scheduledOrdersCount})`}
                {tab.id === "positions" &&
                  `Positions (${openPositions ? openPositions.length : 0})`}
                {tab.id === "order-history" && `History (${historyCount})`}
              </span>
              {/* Desktop: Show full labels */}
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "open-orders" && (
          <OpenOrdersTabs symbol={symbol} roomId={roomId || ""} />
        )}
        {activeTab === "scheduled-orders" && (
          <ScheduledOrdersTabs roomId={roomId as string} />
        )}
        {activeTab === "positions" && (
          <PositionsTabs
            roomId={roomId as string}
            symbol={symbol}
            livePriceOverride={livePrice}
          />
        )}
        {activeTab === "order-history" && (
          <OrderHistoryTabs
            symbol={symbol}
            roomId={roomId}
            onCountChange={(n) => setHistoryCount(n)}
          />
        )}
      </div>
    </div>
  );
}
