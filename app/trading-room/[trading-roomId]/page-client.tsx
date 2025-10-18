"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { MarketWidget } from "@/components/test-components/market-widget";
import { RoomHeader } from "@/components/test-components/room-header";
import { TradingViewChartTest } from "@/components/test-components/trading-view-chart";
import { OrderBookTest } from "@/components/test-components/order-book-test";
import { TradeForm } from "@/components/test-components/trade-form";
import { TradingTabs } from "@/components/test-components/trading-tabs";
import { cn } from "@/lib/utils";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useDebounce } from "@/hooks/use-debounce";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Responsive,
  WidthProvider,
  type Layout,
  type Layouts,
} from "react-grid-layout";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface OpenOrder {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  limit_price: number;
  quantity: number;
  status: string;
}

interface ScheduledOrder {
  id: string;
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
}

interface RealtimePayload {
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
  eventType?: string;
}

interface TradingRoomPageClientProps {
  room: {
    id: string;
    name: string;
    creator_id: string;
    symbol: string;
    category: string;
    privacy: string;
    is_active: boolean;
    room_status: string;
    virtual_balance: number;
    updated_at: string;
  };
  creatorId: string;
}

export function TradingRoomPageClient({
  room,
  creatorId,
}: TradingRoomPageClientProps) {
  const [mounted, setMounted] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(room);
  const [, setCurrentUserId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [layouts, setLayouts] = useState<Layouts>({
    // Desktop layout (1200px+)
    lg: [
      { i: "trading-chart", x: 0, y: 0, w: 9.5, h: 10 },
      { i: "order-book", x: 9.5, y: 0, w: 2.5, h: 10 },
      { i: "trading-tabs", x: 0, y: 10, w: 12, h: 7 },
    ],
    // Tablet layout (768px - 1199px)
    md: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 7 },
      { i: "order-book", x: 0, y: 7, w: 12, h: 10 },
      { i: "trading-tabs", x: 0, y: 13, w: 12, h: 5 },
    ],
    // Mobile layout (below 768px)
    sm: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 5 },
      { i: "order-book", x: 0, y: 5, w: 12, h: 10 },
      { i: "trading-tabs", x: 0, y: 10, w: 12, h: 4 },
    ],
    xs: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 5 },
      { i: "order-book", x: 0, y: 5, w: 12, h: 10 },
      { i: "trading-tabs", x: 0, y: 10, w: 12, h: 4 },
    ],
    xxs: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 5 },
      { i: "order-book", x: 0, y: 5, w: 12, h: 10 },
      { i: "trading-tabs", x: 0, y: 10, w: 12, h: 4 },
    ],
  });

  // Page visibility and performance optimization
  const { isVisible, isDocumentVisible } = usePageVisibility();

  // Local cache of open orders for matcher (maintained via realtime)
  const openOrdersRef = useRef<OpenOrder[]>([]);
  const queryClient = useQueryClient();
  const executedOrdersRef = useRef<Set<string>>(new Set());

  // Refs to prevent unnecessary re-subscriptions
  const channelRef = useRef<unknown>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if current user is the room creator
  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          setIsCreator(user.id === creatorId);
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkUser();
  }, [creatorId]);

  // Update current room when prop changes (debounced to prevent rapid updates)
  const debouncedRoomUpdate = useDebounce((newRoom: typeof room) => {
    setCurrentRoom(newRoom);
  }, 100);

  useEffect(() => {
    debouncedRoomUpdate(room);
  }, [room, debouncedRoomUpdate]);

  const handleLayoutChange = useCallback(
    (layout: Layout[], layouts: Layouts) => {
      setLayouts(layouts);
      console.log(layout, layouts);
    },
    []
  );

  const handleRoomUpdate = useCallback((updatedRoom: Partial<typeof room>) => {
    setCurrentRoom((prev) => ({
      ...prev,
      ...updatedRoom,
    }));

    // Update page title dynamically
    if (updatedRoom.name) {
      document.title = `${updatedRoom.name} | Weetoo`;
    }
  }, []);

  // Expose room id globally for client-only modules that need it (only when visible)
  useEffect(() => {
    if (isVisible) {
      try {
        (window as unknown as Record<string, unknown>).CURRENT_TRADING_ROOM_ID =
          currentRoom.id;
      } catch {}
    }
  }, [currentRoom.id, isVisible]);

  // Live matcher: fill limit orders using bid/ask rules (optimized for performance)
  const ticker = useTickerData(currentRoom.symbol as string);

  // Memoize ticker data to prevent unnecessary re-renders
  const memoizedTickerData = useMemo(
    () => ({
      lastPrice: ticker?.lastPrice,
      bestAskPrice: (ticker as unknown as Record<string, unknown>)
        ?.bestAskPrice,
      bestBidPrice: (ticker as unknown as Record<string, unknown>)
        ?.bestBidPrice,
      ask: (ticker as unknown as Record<string, unknown>)?.ask,
      bid: (ticker as unknown as Record<string, unknown>)?.bid,
      askPrice: (ticker as unknown as Record<string, unknown>)?.askPrice,
      bidPrice: (ticker as unknown as Record<string, unknown>)?.bidPrice,
    }),
    [
      ticker?.lastPrice,
      (ticker as unknown as Record<string, unknown>)?.bestAskPrice,
      (ticker as unknown as Record<string, unknown>)?.bestBidPrice,
      (ticker as unknown as Record<string, unknown>)?.ask,
      (ticker as unknown as Record<string, unknown>)?.bid,
      (ticker as unknown as Record<string, unknown>)?.askPrice,
      (ticker as unknown as Record<string, unknown>)?.bidPrice,
    ]
  );

  useEffect(() => {
    // Only run when page is visible and not already initialized
    if (!isVisible || !isDocumentVisible || isInitializedRef.current) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    const filling = new Set<string>();
    isInitializedRef.current = true;

    // Seed local cache once
    const seedCache = async () => {
      try {
        const { data } = await supabase
          .from("trading_room_open_orders")
          .select("*")
          .eq("room_id", currentRoom.id)
          .eq("status", "open")
          .eq("symbol", currentRoom.symbol);
        openOrdersRef.current = Array.isArray(data) ? data : [];
      } catch {}
    };
    seedCache();

    // Realtime maintain cache
    const channel = supabase
      .channel(`open-orders-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_open_orders",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        (payload: RealtimePayload) => {
          const before = payload?.old;
          const after = payload?.new;
          const list = openOrdersRef.current;

          const removeById = (id: string) => {
            const idx = list.findIndex((x: OpenOrder) => x.id === id);
            if (idx >= 0) list.splice(idx, 1);
          };

          if (payload.eventType === "INSERT") {
            if (
              after?.status === "open" &&
              after?.symbol === currentRoom.symbol
            ) {
              list.push(after as unknown as OpenOrder);
            }
          } else if (payload.eventType === "UPDATE") {
            // Remove if it left the open set or symbol changed
            if (
              (before?.status === "open" && after?.status !== "open") ||
              before?.symbol !== after?.symbol
            ) {
              removeById(String(before?.id));
            }
            // Add/replace if it is now an open order for this symbol
            if (
              after?.status === "open" &&
              after?.symbol === currentRoom.symbol
            ) {
              removeById(String(after.id));
              list.push(after as unknown as OpenOrder);
            }
          } else if (payload.eventType === "DELETE") {
            removeById(String(before?.id));
          }
          openOrdersRef.current = list;
        }
      )
      .subscribe();

    channelRef.current = channel;

    const tick = () => {
      if (cancelled || !isVisible || !isDocumentVisible) return;

      const parseNum = (v: unknown) =>
        typeof v === "number"
          ? v
          : v
          ? parseFloat(String(v).replace(/,/g, ""))
          : NaN;
      const ask = parseNum(
        memoizedTickerData.bestAskPrice ??
          memoizedTickerData.ask ??
          memoizedTickerData.askPrice ??
          memoizedTickerData.lastPrice
      );
      const bid = parseNum(
        memoizedTickerData.bestBidPrice ??
          memoizedTickerData.bid ??
          memoizedTickerData.bidPrice ??
          memoizedTickerData.lastPrice
      );
      if (!Number.isFinite(ask) || !Number.isFinite(bid)) return;

      const orders = openOrdersRef.current.slice();
      for (const o of orders) {
        if (filling.has(o.id)) continue;
        const price = Number(o.limit_price);
        if (!Number.isFinite(price)) continue;
        const shouldFill = o.side === "long" ? price >= ask : price <= bid;
        if (shouldFill) {
          filling.add(o.id);
          fetch(`/api/trading-room/${currentRoom.id}/open-orders`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "fill",
              orderId: o.id,
              fillPrice: o.side === "long" ? ask : bid,
            }),
          }).finally(() => filling.delete(o.id));
        }
      }
    };

    const id = setInterval(tick, 1000);
    intervalRef.current = id;

    return () => {
      cancelled = true;
      clearInterval(id);
      if (channelRef.current) {
        (channelRef.current as { unsubscribe: () => void }).unsubscribe();
        channelRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [
    currentRoom.id,
    currentRoom.symbol,
    isVisible,
    isDocumentVisible,
    memoizedTickerData,
  ]);

  // Client-Side Scheduled Orders Execution Engine (Event-Driven)
  // Disabled by default to prevent executions being triggered on page visit.
  // Enable only if explicitly allowed via env flag.
  const ENABLE_CLIENT_EXECUTOR =
    process.env.NEXT_PUBLIC_ENABLE_CLIENT_EXECUTOR === "true";

  useEffect(() => {
    if (!ENABLE_CLIENT_EXECUTOR) return;
    if (!memoizedTickerData.lastPrice) return;
    if (!isVisible || !isDocumentVisible) return;

    const checkAndExecuteOrders = async () => {
      try {
        if (!queryClient) return;

        const cachedData = queryClient.getQueryData([
          "scheduled-orders",
          currentRoom.id,
        ]) as { data?: ScheduledOrder[] };
        if (!cachedData?.data) return;

        const scheduledOrders = cachedData.data.filter(
          (order: ScheduledOrder) => order.status === "pending"
        );
        if (scheduledOrders.length === 0) return;

        const now = new Date();
        const currentPrice = Number(memoizedTickerData.lastPrice);

        for (const order of scheduledOrders) {
          // Sanity check: ignore bad IDs or missing schedule types
          if (
            !order?.id ||
            !order?.schedule_type ||
            executedOrdersRef.current.has(order.id)
          ) {
            continue;
          }

          let shouldExecute = false;
          if (order.schedule_type === "time_based" && order.scheduled_at) {
            shouldExecute = new Date(order.scheduled_at) <= now;
          }
          if (
            order.schedule_type === "price_based" &&
            order.trigger_price &&
            order.trigger_condition
          ) {
            shouldExecute =
              order.trigger_condition === "above"
                ? currentPrice >= order.trigger_price
                : currentPrice <= order.trigger_price;
          }

          if (shouldExecute) {
            executedOrdersRef.current.add(order.id);
            await fetch(
              `/api/trading-room/${currentRoom.id}/scheduled-orders/${order.id}/execute`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  client_time: now.toISOString(),
                  current_price: currentPrice,
                }),
              }
            ).catch(() => executedOrdersRef.current.delete(order.id));
          }
        }
      } catch {}
    };

    checkAndExecuteOrders();
  }, [
    ENABLE_CLIENT_EXECUTOR,
    currentRoom.id,
    memoizedTickerData.lastPrice,
    isVisible,
    isDocumentVisible,
    queryClient,
  ]);

  // Cleanup effect for page visibility changes
  useEffect(() => {
    if (!isVisible || !isDocumentVisible) {
      // Pause intervals when page is not visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // Resume intervals when page becomes visible
      if (!intervalRef.current && isInitializedRef.current) {
        const tick = () => {
          if (!isVisible || !isDocumentVisible) return;

          const parseNum = (v: unknown) =>
            typeof v === "number"
              ? v
              : v
              ? parseFloat(String(v).replace(/,/g, ""))
              : NaN;
          const ask = parseNum(
            memoizedTickerData.bestAskPrice ??
              memoizedTickerData.ask ??
              memoizedTickerData.askPrice ??
              memoizedTickerData.lastPrice
          );
          const bid = parseNum(
            memoizedTickerData.bestBidPrice ??
              memoizedTickerData.bid ??
              memoizedTickerData.bidPrice ??
              memoizedTickerData.lastPrice
          );
          if (!Number.isFinite(ask) || !Number.isFinite(bid)) return;

          const orders = openOrdersRef.current.slice();
          const filling = new Set<string>();
          for (const o of orders) {
            if (filling.has(o.id)) continue;
            const price = Number(o.limit_price);
            if (!Number.isFinite(price)) continue;
            const shouldFill = o.side === "long" ? price >= ask : price <= bid;
            if (shouldFill) {
              filling.add(o.id);
              fetch(`/api/trading-room/${currentRoom.id}/open-orders`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "fill",
                  orderId: o.id,
                  fillPrice: o.side === "long" ? ask : bid,
                }),
              }).finally(() => filling.delete(o.id));
            }
          }
        };

        intervalRef.current = setInterval(tick, 1000);
      }
    }
  }, [isVisible, isDocumentVisible, currentRoom.id, memoizedTickerData]);

  // Loading Component
  const LoadingMessage = () => (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <div className="text-center max-w-sm mx-auto px-6">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-3">
          Loading...
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Checking room access permissions.
        </p>
      </div>
    </div>
  );

  // Under Construction Component for Participants
  const UnderConstructionMessage = () => (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <div className="text-center max-w-sm mx-auto px-6">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-3">
          Under Construction
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          This trading room is currently being developed. The full trading
          interface is only available to the room creator at this time.
        </p>

        <div className="mt-6 text-xs text-muted-foreground/70">
          Check back later for updates!
        </div>
      </div>
    </div>
  );

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return <LoadingMessage />;
  }

  // Show under construction message for non-creators
  if (!isCreator) {
    return <UnderConstructionMessage />;
  }

  return (
    <main className="flex flex-col h-full w-full gap-1 p-0.5 overflow-y-auto scrollbar-none bg-background text-foreground">
      <RoomHeader room={currentRoom} onRoomUpdate={handleRoomUpdate} />

      {/* Mobile Layout - Stacked vertically */}
      <div className="flex flex-col lg:hidden w-full flex-1 gap-1">
        {/* Market Widget */}
        <div className="w-full">
          <MarketWidget symbol={currentRoom.symbol as string} />
        </div>

        {/* Mobile Grid Layout */}
        <div className="flex flex-col w-full flex-1 relative">
          <div
            className={cn(
              "absolute inset-0 z-10 transition-opacity duration-300",
              mounted ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <div className="w-full h-[60px] mb-1 bg-muted/30 rounded border border-border animate-pulse"></div>
            <div className="w-full h-[300px] mb-1 bg-muted/30 rounded border border-border animate-pulse"></div>
            <div className="w-full h-[300px] mb-1 bg-muted/30 rounded border border-border animate-pulse"></div>
            <div className="w-full h-[240px] bg-muted/30 rounded border border-border animate-pulse"></div>
          </div>

          <ResponsiveGridLayout
            className={cn("layout", mounted && "mounted")}
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            rowHeight={60}
            isDraggable={false}
            isResizable={false}
            margin={[4, 4]}
            containerPadding={undefined}
            useCSSTransforms={true}
            compactType="vertical"
            preventCollision={false}
          >
            <div key="trading-chart" className="h-full">
              <TradingViewChartTest
                symbol={currentRoom.symbol as string}
                roomId={currentRoom.id}
              />
            </div>

            <div key="order-book" className="h-full">
              <OrderBookTest symbol={currentRoom.symbol as string} />
            </div>

            <div key="trading-tabs">
              <TradingTabs
                symbol={currentRoom.symbol as string}
                roomId={currentRoom.id}
              />
            </div>
          </ResponsiveGridLayout>
        </div>

        {/* Trade Form - Bottom on mobile */}
        <div className="w-full h-auto min-h-[400px] lg:hidden">
          <TradeForm
            roomId={currentRoom.id}
            symbol={currentRoom.symbol as string}
            availableBalance={currentRoom.virtual_balance}
          />
        </div>
      </div>

      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex w-full gap-1 flex-1">
        <div className="flex flex-col max-w-[1590px] w-full h-full relative">
          <MarketWidget symbol={currentRoom.symbol as string} />
          <div
            className={cn(
              "absolute inset-0 z-10 transition-opacity duration-300",
              mounted ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <div className="w-full h-[60px] mb-1 bg-muted/30 rounded border border-border animate-pulse"></div>

            <div className="flex gap-1 mb-1 h-[660px]">
              <div className="w-[75%] bg-muted/30 rounded border border-border animate-pulse"></div>
              <div className="w-[25%] bg-muted/30 rounded border border-border animate-pulse"></div>
            </div>

            <div className="w-full h-[240px] bg-muted/30 rounded border border-border animate-pulse"></div>
          </div>

          {/* Desktop Grid Layout */}
          <ResponsiveGridLayout
            className={cn("layout", mounted && "mounted")}
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            rowHeight={60}
            isDraggable={true}
            isResizable={true}
            margin={[0, 4]}
            containerPadding={undefined}
            useCSSTransforms={true}
            compactType="vertical"
            preventCollision={false}
            resizeHandles={["se"]}
          >
            <div key="trading-chart" className="h-full">
              <TradingViewChartTest
                symbol={currentRoom.symbol as string}
                roomId={currentRoom.id}
              />
            </div>

            <div key="order-book" className="h-full">
              <OrderBookTest symbol={currentRoom.symbol as string} />
            </div>

            <div key="trading-tabs">
              <TradingTabs
                symbol={currentRoom.symbol as string}
                roomId={currentRoom.id}
              />
            </div>
          </ResponsiveGridLayout>
        </div>

        {/* Trade Form - Side panel on desktop */}
        <div className="w-full sm:w-[320px] md:w-[350px] lg:w-[380px] xl:w-[400px] h-full">
          <TradeForm
            roomId={currentRoom.id}
            symbol={currentRoom.symbol as string}
            availableBalance={currentRoom.virtual_balance}
          />
        </div>
      </div>
    </main>
  );
}
