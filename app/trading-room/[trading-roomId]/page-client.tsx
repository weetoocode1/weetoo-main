"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
const MarketWidget = dynamic(
  () =>
    import("@/components/test-components/market-widget").then((m) => ({
      default: m.MarketWidget,
    })),
  { ssr: false }
);
const RoomHeader = dynamic(
  () =>
    import("@/components/test-components/room-header").then((m) => ({
      default: m.RoomHeader,
    })),
  { ssr: false }
);
const TradingViewChartTest = dynamic(
  () =>
    import("@/components/test-components/trading-view-chart").then((m) => ({
      default: m.TradingViewChartTest,
    })),
  { ssr: false }
);
const OrderBookTest = dynamic(
  () =>
    import("@/components/test-components/order-book-test").then((m) => ({
      default: m.OrderBookTest,
    })),
  { ssr: false }
);
const TradeForm = dynamic(
  () =>
    import("@/components/test-components/trade-form").then((m) => ({
      default: m.TradeForm,
    })),
  { ssr: false }
);
const TradingTabs = dynamic(
  () =>
    import("@/components/test-components/trading-tabs").then((m) => ({
      default: m.TradingTabs,
    })),
  { ssr: false }
);
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
const Viewer = dynamic(
  () =>
    import("@/components/test-components/test-stream/viewer").then((m) => ({
      default: m.Viewer,
    })),
  { ssr: false }
);

const ResponsiveGridLayout = WidthProvider(Responsive);

// Memoized grid children to prevent re-renders during drag/resize
const MemoizedTradingChart = memo(TradingViewChartTest);
const MemoizedOrderBook = memo(OrderBookTest);
const MemoizedTradingTabs = memo(TradingTabs);

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
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const gridBreakpoints = useMemo(
    () => ({ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }),
    []
  );
  const rowHeight = 60;
  const mobileMargin: [number, number] = useMemo(() => [4, 4], []);
  const desktopMargin: [number, number] = useMemo(() => [0, 4], []);

  const [layouts, setLayouts] = useState<Layouts>({
    // Desktop layout (1200px+)
    lg: [
      { i: "trading-chart", x: 0, y: 0, w: 9.5, h: 10 },
      { i: "order-book", x: 9.5, y: 0, w: 2.5, h: 10 },
    ],
    // Tablet layout (768px - 1199px)
    md: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 7 },
      { i: "order-book", x: 0, y: 7, w: 12, h: 10 },
    ],
    // Mobile layout (below 768px)
    sm: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 5 },
      { i: "order-book", x: 0, y: 5, w: 12, h: 10 },
    ],
    xs: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 5 },
      { i: "order-book", x: 0, y: 5, w: 12, h: 10 },
    ],
    xxs: [
      { i: "trading-chart", x: 0, y: 0, w: 12, h: 5 },
      { i: "order-book", x: 0, y: 5, w: 12, h: 10 },
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

  const layoutUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  const handleLayoutChange = useCallback(
    (layout: Layout[], nextLayouts: Layouts) => {
      if (layoutUpdateRef.current) {
        clearTimeout(layoutUpdateRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        layoutUpdateRef.current = setTimeout(() => {
          if (!isDraggingRef.current && !isResizingRef.current) {
            setLayouts(nextLayouts);
          }
        }, 500);
      });
    },
    []
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    isDraggingRef.current = true;
    if (layoutUpdateRef.current) {
      clearTimeout(layoutUpdateRef.current);
    }
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    isResizingRef.current = true;
    if (layoutUpdateRef.current) {
      clearTimeout(layoutUpdateRef.current);
    }
  }, []);

  const handleResizeStop = useCallback(() => {
    setIsResizing(false);
    isResizingRef.current = false;
  }, []);

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

  useEffect(() => {
    return () => {
      if (layoutUpdateRef.current) {
        clearTimeout(layoutUpdateRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Drag is cancelled for buttons/inputs by draggableCancel on the grid

  // Memoize stable props to prevent unnecessary re-renders
  const memoizedSymbol = useMemo(
    () => currentRoom.symbol as string,
    [currentRoom.symbol]
  );
  const memoizedRoomId = useMemo(() => currentRoom.id, [currentRoom.id]);
  const memoizedBalance = useMemo(
    () => currentRoom.virtual_balance,
    [currentRoom.virtual_balance]
  );

  // Live matcher: fill limit orders using bid/ask rules (optimized for performance)
  const ticker = useTickerData(currentRoom.symbol as string);

  // Use ref to store latest ticker data to avoid re-renders
  const tickerRef = useRef(ticker);
  useEffect(() => {
    tickerRef.current = ticker;
  }, [ticker]);

  // Memoize ticker data with stable references to prevent unnecessary re-renders
  const memoizedTickerData = useMemo(() => {
    const t = tickerRef.current;
    if (!t) {
      return {
        lastPrice: undefined,
        bestAskPrice: undefined,
        bestBidPrice: undefined,
        ask: undefined,
        bid: undefined,
        askPrice: undefined,
        bidPrice: undefined,
      };
    }
    return {
      lastPrice: t.lastPrice,
      bestAskPrice: (t as unknown as Record<string, unknown>)?.bestAskPrice,
      bestBidPrice: (t as unknown as Record<string, unknown>)?.bestBidPrice,
      ask: (t as unknown as Record<string, unknown>)?.ask,
      bid: (t as unknown as Record<string, unknown>)?.bid,
      askPrice: (t as unknown as Record<string, unknown>)?.askPrice,
      bidPrice: (t as unknown as Record<string, unknown>)?.bidPrice,
    };
  }, [ticker?.lastPrice]); // Only depend on lastPrice to minimize re-renders

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
      // Use ref for latest data to avoid dependency issues
      const currentTicker = tickerRef.current;
      const tickerData = currentTicker
        ? {
            bestAskPrice: (currentTicker as unknown as Record<string, unknown>)
              ?.bestAskPrice,
            bestBidPrice: (currentTicker as unknown as Record<string, unknown>)
              ?.bestBidPrice,
            ask: (currentTicker as unknown as Record<string, unknown>)?.ask,
            bid: (currentTicker as unknown as Record<string, unknown>)?.bid,
            askPrice: (currentTicker as unknown as Record<string, unknown>)
              ?.askPrice,
            bidPrice: (currentTicker as unknown as Record<string, unknown>)
              ?.bidPrice,
            lastPrice: currentTicker.lastPrice,
          }
        : memoizedTickerData;
      const ask = parseNum(
        tickerData.bestAskPrice ??
          tickerData.ask ??
          tickerData.askPrice ??
          tickerData.lastPrice
      );
      const bid = parseNum(
        tickerData.bestBidPrice ??
          tickerData.bid ??
          tickerData.bidPrice ??
          tickerData.lastPrice
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
  }, [currentRoom.id, currentRoom.symbol, isVisible, isDocumentVisible]);

  // Client-Side Scheduled Orders Execution Engine (Event-Driven)
  // Disabled by default to prevent executions being triggered on page visit.
  // Enable only if explicitly allowed via env flag.
  const ENABLE_CLIENT_EXECUTOR =
    process.env.NEXT_PUBLIC_ENABLE_CLIENT_EXECUTOR === "true";

  useEffect(() => {
    if (!ENABLE_CLIENT_EXECUTOR) return;
    const currentTicker = tickerRef.current;
    if (!currentTicker?.lastPrice) return;
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
        const currentTicker = tickerRef.current;
        const currentPrice = Number(currentTicker?.lastPrice || 0);

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
    ticker?.lastPrice,
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
          const currentTicker = tickerRef.current;
          const tickerData = currentTicker
            ? {
                bestAskPrice: (
                  currentTicker as unknown as Record<string, unknown>
                )?.bestAskPrice,
                bestBidPrice: (
                  currentTicker as unknown as Record<string, unknown>
                )?.bestBidPrice,
                ask: (currentTicker as unknown as Record<string, unknown>)?.ask,
                bid: (currentTicker as unknown as Record<string, unknown>)?.bid,
                askPrice: (currentTicker as unknown as Record<string, unknown>)
                  ?.askPrice,
                bidPrice: (currentTicker as unknown as Record<string, unknown>)
                  ?.bidPrice,
                lastPrice: currentTicker.lastPrice,
              }
            : memoizedTickerData;
          const ask = parseNum(
            tickerData.bestAskPrice ??
              tickerData.ask ??
              tickerData.askPrice ??
              tickerData.lastPrice
          );
          const bid = parseNum(
            tickerData.bestBidPrice ??
              tickerData.bid ??
              tickerData.bidPrice ??
              tickerData.lastPrice
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
  }, [isVisible, isDocumentVisible, currentRoom.id]);

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

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return <LoadingMessage />;
  }

  // Show viewer interface for non-creators
  if (!isCreator) {
    return <Viewer roomId={currentRoom.id} />;
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
            className={cn(
              "layout",
              mounted && "mounted",
              (isDragging || isResizing) && "dragging"
            )}
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onDragStop={handleDragStop}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            breakpoints={gridBreakpoints}
            rowHeight={rowHeight}
            isDraggable={true}
            isResizable={true}
            margin={mobileMargin}
            containerPadding={undefined}
            useCSSTransforms={true}
            compactType="vertical"
            preventCollision={false}
            transformScale={1}
            draggableCancel={
              ".grid-action-button, button, [data-grid-no-drag], input, textarea, select, [role='button'], [role='menuitem'], [tabindex]"
            }
          >
            <div key="trading-chart" className="h-full">
              <MemoizedTradingChart
                symbol={memoizedSymbol}
                roomId={memoizedRoomId}
              />
            </div>

            <div key="order-book" className="h-full">
              <MemoizedOrderBook symbol={memoizedSymbol} />
            </div>
          </ResponsiveGridLayout>
        </div>

        {/* Trading Tabs - moved outside grid (mobile) */}
        <div className="w-full h-[360px] mt-1 relative z-50 trading-tabs-surface">
          <MemoizedTradingTabs
            symbol={memoizedSymbol}
            roomId={memoizedRoomId}
          />
        </div>

        {/* Trade Form - Bottom on mobile */}
        <div className="w-full h-auto min-h-[400px] lg:hidden">
          <TradeForm
            roomId={memoizedRoomId}
            symbol={memoizedSymbol}
            availableBalance={memoizedBalance}
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
            className={cn(
              "layout",
              mounted && "mounted",
              (isDragging || isResizing) && "dragging"
            )}
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onDragStop={handleDragStop}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            breakpoints={gridBreakpoints}
            rowHeight={rowHeight}
            isDraggable={true}
            isResizable={true}
            margin={desktopMargin}
            containerPadding={undefined}
            useCSSTransforms={true}
            compactType="vertical"
            preventCollision={false}
            resizeHandles={["se"]}
            transformScale={1}
            draggableCancel={
              ".grid-action-button, button, [data-grid-no-drag], input, textarea, select, [role='button'], [role='menuitem'], [tabindex]"
            }
          >
            <div key="trading-chart" className="h-full">
              <MemoizedTradingChart
                symbol={memoizedSymbol}
                roomId={memoizedRoomId}
              />
            </div>

            <div key="order-book" className="h-full">
              <MemoizedOrderBook symbol={memoizedSymbol} />
            </div>
          </ResponsiveGridLayout>

          {/* Trading Tabs - moved outside grid (desktop, left column) */}
          <div className="w-full h-[420px] mt-1 relative z-50 trading-tabs-surface">
            <MemoizedTradingTabs
              symbol={memoizedSymbol}
              roomId={memoizedRoomId}
            />
          </div>
        </div>

        {/* Trade Form - Side panel on desktop */}
        <div className="w-full sm:w-[320px] md:w-[350px] lg:w-[380px] xl:w-[400px] h-full">
          <TradeForm
            roomId={memoizedRoomId}
            symbol={memoizedSymbol}
            availableBalance={memoizedBalance}
          />
        </div>
      </div>
    </main>
  );
}
