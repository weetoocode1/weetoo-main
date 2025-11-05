// ===== MARKET DATA HOOK =====
// React hook for consuming real-time market data
// Provides easy-to-use interface for components

import { useState, useEffect, useRef, useCallback } from "react";
import { WebSocketClient } from "@/lib/websocket/client";
import type {
  TickerData,
  OrderBookData,
  TradeData,
  KlineData,
  MarketDataState,
  ConnectionStatus,
  Symbol,
  Interval,
} from "@/types/market";

interface UseMarketDataOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useMarketData(options: UseMarketDataOptions = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options;

  // ===== STATE MANAGEMENT =====

  const [marketData, setMarketData] = useState<MarketDataState>({
    ticker: null,
    orderBook: null,
    recentTrades: [],
    klines: [],
    connectionStatus: {
      connected: false,
      reconnecting: false,
    },
  });

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const isInitializedRef = useRef(false);
  const tickerUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  // ===== INITIALIZATION =====

  useEffect(() => {
    if (isInitializedRef.current) return;

    isInitializedRef.current = true;

    const wsClient = new WebSocketClient({
      reconnectInterval,
      maxReconnectAttempts,
    });

    wsClientRef.current = wsClient;

    // Set up event listeners
    wsClient.on("ticker", handleTickerData);
    wsClient.on("orderbook", handleOrderBookData);
    wsClient.on("trade", handleTradeData);
    wsClient.on("kline", handleKlineData);
    wsClient.on("status", handleConnectionStatus);
    wsClient.on("bybit_status", handleBybitStatus);
    wsClient.on("bybit_error", handleBybitError);

    if (autoConnect) {
      wsClient.connect();
    }

    return () => {
      wsClient.disconnect();
      wsClientRef.current = null;

      // Clear any pending ticker updates
      if (tickerUpdateTimeoutRef.current) {
        clearTimeout(tickerUpdateTimeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (orderBookRafRef.current) {
        cancelAnimationFrame(orderBookRafRef.current);
      }
      if (tradeRafRef.current) {
        cancelAnimationFrame(tradeRafRef.current);
      }
      if (klineRafRef.current) {
        cancelAnimationFrame(klineRafRef.current);
      }
    };
  }, [autoConnect, reconnectInterval, maxReconnectAttempts]);

  // ===== EVENT HANDLERS =====

  const firstTickerReceivedRef = useRef(false);
  const tickerDataRef = useRef<TickerData | null>(null);

  const handleTickerData = useCallback((data: TickerData) => {
    if (!data || data.symbol === "") return;

    // Store latest data immediately
    tickerDataRef.current = data;

    // If funding fields are present, update immediately (no debounce)
    const hasFundingUpdate =
      (data as any).fundingRate !== undefined ||
      (data as any).predictedFundingRate !== undefined ||
      (data as any).nextFundingTime !== undefined;

    // Also update immediately if markPrice is present in this payload
    const hasMarkPriceUpdate = (data as any).markPrice !== undefined;

    if (
      !firstTickerReceivedRef.current ||
      hasFundingUpdate ||
      hasMarkPriceUpdate
    ) {
      firstTickerReceivedRef.current = true;
      // Use requestAnimationFrame for smooth updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        setMarketData((prev) => ({ ...prev, ticker: data }));
      });
      return;
    }

    // Debounce other ticker fields to smooth UI, using RAF
    if (tickerUpdateTimeoutRef.current) {
      clearTimeout(tickerUpdateTimeoutRef.current);
    }
    tickerUpdateTimeoutRef.current = setTimeout(() => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        setMarketData((prev) => ({
          ...prev,
          ticker: tickerDataRef.current || data,
        }));
      });
    }, 100);
  }, []);

  const orderBookRafRef = useRef<number | null>(null);
  const orderBookDataRef = useRef<OrderBookData | null>(null);

  const handleOrderBookData = useCallback((data: OrderBookData) => {
    // Store latest data
    orderBookDataRef.current = data;

    // Batch updates using requestAnimationFrame
    if (orderBookRafRef.current) {
      cancelAnimationFrame(orderBookRafRef.current);
    }
    orderBookRafRef.current = requestAnimationFrame(() => {
      setMarketData((prev) => ({
        ...prev,
        orderBook: orderBookDataRef.current || data,
      }));
    });
  }, []);

  const tradeRafRef = useRef<number | null>(null);
  const tradeDataRef = useRef<TradeData[]>([]);

  const handleTradeData = useCallback((data: TradeData) => {
    // Store latest trade
    tradeDataRef.current = [data, ...tradeDataRef.current.slice(0, 99)];

    // Batch updates using requestAnimationFrame
    if (tradeRafRef.current) {
      cancelAnimationFrame(tradeRafRef.current);
    }
    tradeRafRef.current = requestAnimationFrame(() => {
      setMarketData((prev) => ({
        ...prev,
        recentTrades: tradeDataRef.current,
      }));
    });
  }, []);

  const klineRafRef = useRef<number | null>(null);
  const klineDataRef = useRef<KlineData[]>([]);

  const handleKlineData = useCallback((data: KlineData) => {
    // Store latest kline
    klineDataRef.current = [data, ...klineDataRef.current.slice(0, 199)];

    // Batch updates using requestAnimationFrame
    if (klineRafRef.current) {
      cancelAnimationFrame(klineRafRef.current);
    }
    klineRafRef.current = requestAnimationFrame(() => {
      setMarketData((prev) => ({
        ...prev,
        klines: klineDataRef.current,
      }));
    });
  }, []);

  const handleConnectionStatus = useCallback((status: ConnectionStatus) => {
    setMarketData((prev) => ({
      ...prev,
      connectionStatus: status,
    }));
  }, []);

  const handleBybitStatus = useCallback((status: ConnectionStatus) => {
    console.log("📡 Bybit connection status:", status);
  }, []);

  const handleBybitError = useCallback((error: any) => {
    console.error("❌ Bybit error:", error);
  }, []);

  // ===== PUBLIC METHODS =====

  const connect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }
  }, []);

  const subscribeToTicker = useCallback((symbol: Symbol) => {
    if (wsClientRef.current) {
      wsClientRef.current.subscribeToTicker(symbol);
    }
  }, []);

  const subscribeToOrderBook = useCallback(
    (symbol: Symbol, depth: number = 50) => {
      if (wsClientRef.current) {
        wsClientRef.current.subscribeToOrderBook(symbol, depth);
      }
    },
    []
  );

  const subscribeToTrades = useCallback((symbol: Symbol) => {
    if (wsClientRef.current) {
      wsClientRef.current.subscribeToTrades(symbol);
    }
  }, []);

  const subscribeToKlines = useCallback(
    (symbol: Symbol, interval: Interval) => {
      if (wsClientRef.current) {
        wsClientRef.current.subscribeToKlines(symbol, interval);
      }
    },
    []
  );

  const unsubscribeFromTicker = useCallback((symbol: Symbol) => {
    if (wsClientRef.current) {
      wsClientRef.current.unsubscribe(`tickers.${symbol}`);
    }
  }, []);

  const unsubscribeFromOrderBook = useCallback(
    (symbol: Symbol, depth: number = 50) => {
      if (wsClientRef.current) {
        wsClientRef.current.unsubscribe(`orderbook.${depth}.${symbol}`);
      }
    },
    []
  );

  const unsubscribeFromTrades = useCallback((symbol: Symbol) => {
    if (wsClientRef.current) {
      wsClientRef.current.unsubscribe(`publicTrade.${symbol}`);
    }
  }, []);

  const unsubscribeFromKlines = useCallback(
    (symbol: Symbol, interval: Interval) => {
      if (wsClientRef.current) {
        wsClientRef.current.unsubscribe(`kline.${interval}.${symbol}`);
      }
    },
    []
  );

  // ===== CONVENIENCE METHODS =====

  const subscribeToAll = useCallback(
    (symbol: Symbol, interval: Interval = "1") => {
      subscribeToTicker(symbol);
      subscribeToOrderBook(symbol);
      subscribeToTrades(symbol);
      subscribeToKlines(symbol, interval);
    },
    [
      subscribeToTicker,
      subscribeToOrderBook,
      subscribeToTrades,
      subscribeToKlines,
    ]
  );

  const unsubscribeFromAll = useCallback(
    (symbol: Symbol, interval: Interval = "1") => {
      unsubscribeFromTicker(symbol);
      unsubscribeFromOrderBook(symbol);
      unsubscribeFromTrades(symbol);
      unsubscribeFromKlines(symbol, interval);
    },
    [
      unsubscribeFromTicker,
      unsubscribeFromOrderBook,
      unsubscribeFromTrades,
      unsubscribeFromKlines,
    ]
  );

  // ===== RETURN INTERFACE =====

  return {
    // Data
    ticker: marketData.ticker,
    orderBook: marketData.orderBook,
    recentTrades: marketData.recentTrades,
    klines: marketData.klines,
    connectionStatus: marketData.connectionStatus,

    // Connection methods
    connect,
    disconnect,

    // Subscription methods
    subscribeToTicker,
    subscribeToOrderBook,
    subscribeToTrades,
    subscribeToKlines,
    subscribeToAll,

    // Unsubscription methods
    unsubscribeFromTicker,
    unsubscribeFromOrderBook,
    unsubscribeFromTrades,
    unsubscribeFromKlines,
    unsubscribeFromAll,

    // Status
    isConnected: marketData.connectionStatus.connected,
    isReconnecting: marketData.connectionStatus.reconnecting,
  };
}

// ===== SPECIALIZED HOOKS =====

export function useTickerData(symbol: Symbol, autoConnect: boolean = true) {
  const {
    ticker,
    subscribeToTicker,
    subscribeToTrades,
    unsubscribeFromTicker,
    unsubscribeFromTrades,
    isConnected,
  } = useMarketData({ autoConnect });

  // In-memory cache per symbol to avoid localStorage/rest while enabling
  // instant reuse on remount within the SPA session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (!g.__WS_LAST_TICKER_BY_SYMBOL__) {
    g.__WS_LAST_TICKER_BY_SYMBOL__ = new Map<string, TickerData>();
  }
  const lastTickerBySymbol: Map<string, TickerData> =
    g.__WS_LAST_TICKER_BY_SYMBOL__;

  // Cache last known non-zero values to prevent UI flashing to 0
  const lastRef = useRef<TickerData | null>(null);
  const [stableTicker, setStableTicker] = useState<TickerData | null>(null);

  // Seed from in-memory cache to render instantly on mount
  useEffect(() => {
    const cached = lastTickerBySymbol.get(symbol as string);
    if (cached) {
      lastRef.current = cached;
      setStableTicker(cached);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    if (!ticker) return;
    const keep = (v?: string): string | undefined =>
      v && v !== "0" && v !== "" ? v : undefined;

    const merged: TickerData = {
      symbol: ticker.symbol || lastRef.current?.symbol || "",
      lastPrice: keep(ticker.lastPrice) || lastRef.current?.lastPrice || "0",
      price24hPcnt:
        keep(ticker.price24hPcnt) || lastRef.current?.price24hPcnt || "0",
      prevPrice24h: keep(ticker.prevPrice24h) || lastRef.current?.prevPrice24h,
      change24h: keep(ticker.change24h) || lastRef.current?.change24h || "0",
      tickDirection:
        ticker.tickDirection || lastRef.current?.tickDirection || "",
      highPrice24h:
        keep(ticker.highPrice24h) || lastRef.current?.highPrice24h || "0",
      lowPrice24h:
        keep(ticker.lowPrice24h) || lastRef.current?.lowPrice24h || "0",
      volume24h: keep(ticker.volume24h) || lastRef.current?.volume24h || "0",
      turnover24h:
        keep(ticker.turnover24h) || lastRef.current?.turnover24h || "0",
      fundingRate:
        keep(ticker.fundingRate) || lastRef.current?.fundingRate || "0",
      predictedFundingRate:
        keep(ticker.predictedFundingRate) ||
        lastRef.current?.predictedFundingRate,
      openInterest:
        keep(ticker.openInterest) || lastRef.current?.openInterest || "0",
      markPrice: keep(ticker.markPrice) || lastRef.current?.markPrice || "0",
      indexPrice: keep(ticker.indexPrice) || lastRef.current?.indexPrice || "0",
      nextFundingTime:
        ticker.nextFundingTime || lastRef.current?.nextFundingTime || "0",
    } as TickerData;

    lastRef.current = merged;
    setStableTicker(merged);
    lastTickerBySymbol.set(symbol as string, merged);
  }, [ticker]);

  // no localStorage persistence

  // WebSocket-only initial gate: emit first update only when core fields are present
  useEffect(() => {
    if (!ticker) return;
    const hasCore = (t: TickerData | null) => {
      if (!t) return false;
      const nz = (s?: string) => !!s && s !== "0" && s !== "";
      return nz(t.lastPrice) && nz(t.indexPrice) && nz(t.markPrice);
    };
    if (!hasCore(lastRef.current)) return; // wait until merged ticker above populated core
    // If we reach here, stableTicker may still be null on first time; set from lastRef
    if (!stableTicker) setStableTicker(lastRef.current);
  }, [ticker, stableTicker]);

  useEffect(() => {
    if (isConnected) {
      subscribeToTicker(symbol);
      subscribeToTrades(symbol); // Also subscribe to trades for tickDirection
      return () => {
        unsubscribeFromTicker(symbol);
        unsubscribeFromTrades(symbol);
      };
    }
  }, [
    symbol,
    isConnected,
    subscribeToTicker,
    subscribeToTrades,
    unsubscribeFromTicker,
    unsubscribeFromTrades,
  ]);

  return stableTicker;
}

export function useOrderBookData(
  symbol: Symbol,
  depth: number = 50,
  autoConnect: boolean = true
) {
  const {
    orderBook,
    subscribeToOrderBook,
    unsubscribeFromOrderBook,
    isConnected,
  } = useMarketData({ autoConnect });

  useEffect(() => {
    if (isConnected) {
      subscribeToOrderBook(symbol, depth);
      return () => unsubscribeFromOrderBook(symbol, depth);
    }
  }, [
    symbol,
    depth,
    isConnected,
    subscribeToOrderBook,
    unsubscribeFromOrderBook,
  ]);

  return orderBook;
}

export function useTradeData(symbol: Symbol, autoConnect: boolean = true) {
  const {
    recentTrades,
    subscribeToTrades,
    unsubscribeFromTrades,
    isConnected,
  } = useMarketData({ autoConnect });

  useEffect(() => {
    if (isConnected) {
      subscribeToTrades(symbol);
      return () => unsubscribeFromTrades(symbol);
    }
  }, [symbol, isConnected, subscribeToTrades, unsubscribeFromTrades]);

  return recentTrades;
}

export function useKlineData(
  symbol: Symbol,
  interval: Interval = "1",
  autoConnect: boolean = true
) {
  const { klines, subscribeToKlines, unsubscribeFromKlines, isConnected } =
    useMarketData({ autoConnect });

  useEffect(() => {
    if (isConnected) {
      subscribeToKlines(symbol, interval);
      return () => unsubscribeFromKlines(symbol, interval);
    }
  }, [symbol, interval, isConnected, subscribeToKlines, unsubscribeFromKlines]);

  return klines;
}
