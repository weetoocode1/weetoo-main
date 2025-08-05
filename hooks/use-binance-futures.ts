import { useQuery } from "@tanstack/react-query";

interface TickerData {
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
  volume: string;
}

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
}

interface TradeData {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketData {
  ticker?: TickerData;
  tickerError?: string;
  orderBook?: OrderBookData;
  orderBookError?: string;
  trades?: TradeData[];
  tradesError?: string;
  openInterest?: string | null;
  lastFundingRate?: string | null;
  nextFundingTime?: number | null;
  candles?: CandleData[];
  candlesError?: string;
}

// API functions
async function fetchTicker(symbol: string): Promise<TickerData> {
  const response = await fetch(
    `https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`
  );
  if (!response.ok) throw new Error("Failed to fetch ticker");
  const data = await response.json();
  return {
    lastPrice: data.lastPrice,
    priceChange: data.priceChange,
    priceChangePercent: data.priceChangePercent,
    highPrice: data.highPrice,
    lowPrice: data.lowPrice,
    quoteVolume: data.quoteVolume,
    volume: data.volume,
  };
}

async function fetchOrderBook(symbol: string): Promise<OrderBookData> {
  const response = await fetch(
    `https://api.binance.us/api/v3/depth?symbol=${symbol}&limit=6`
  );
  if (!response.ok) throw new Error("Failed to fetch order book");
  const data = await response.json();
  return {
    bids: data.bids,
    asks: data.asks,
  };
}

async function fetchTrades(symbol: string): Promise<TradeData[]> {
  const response = await fetch(
    `https://api.binance.us/api/v3/trades?symbol=${symbol}&limit=30`
  );
  if (!response.ok) throw new Error("Failed to fetch trades");
  return response.json();
}

async function fetchOpenInterest(symbol: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.openInterest;
  } catch {
    return null;
  }
}

async function fetchFundingRate(
  symbol: string
): Promise<{ lastFundingRate: string | null; nextFundingTime: number | null }> {
  try {
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`
    );
    if (!response.ok) return { lastFundingRate: null, nextFundingTime: null };
    const data = await response.json();
    return {
      lastFundingRate: data.lastFundingRate,
      nextFundingTime: data.nextFundingTime,
    };
  } catch {
    return { lastFundingRate: null, nextFundingTime: null };
  }
}

// Hook for fetching candle data specifically for TradingView charts
export function useBinanceCandles(symbol: string, interval: string = "1d") {
  return useQuery({
    queryKey: ["candles", symbol, interval],
    queryFn: async () => {
      const response = await fetch(
        `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}`
      );
      if (!response.ok) throw new Error("Failed to fetch candles");
      const klines = await response.json();
      return klines.map((kline: any[]) => ({
        time: Math.floor(kline[0] / 1000), // Convert to seconds
        open: Number(kline[1]),
        high: Number(kline[2]),
        low: Number(kline[3]),
        close: Number(kline[4]),
        volume: Number(kline[5]),
      }));
    },
    enabled: !!symbol,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

// Utility function for fetching candle data (for use in datafeed)
export async function fetchBinanceCandles(
  symbol: string,
  interval: string = "1d"
): Promise<CandleData[]> {
  const response = await fetch(
    `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}`
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const klines = await response.json();
  return klines.map((kline: any[]) => ({
    time: Math.floor(kline[0] / 1000), // Convert to seconds
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5]),
  }));
}

export function useBinanceFutures(symbol: string): MarketData {
  // Ticker data - updates every second
  const { data: ticker, error: tickerError } = useQuery({
    queryKey: ["ticker", symbol],
    queryFn: () => fetchTicker(symbol),
    enabled: !!symbol,
    refetchInterval: 1000, // 1 second
    staleTime: 500, // 500ms
  });

  // Order book data - updates every 2 seconds
  const { data: orderBook, error: orderBookError } = useQuery({
    queryKey: ["orderbook", symbol],
    queryFn: () => fetchOrderBook(symbol),
    enabled: !!symbol,
    refetchInterval: 2000, // 2 seconds
    staleTime: 1000, // 1 second
  });

  // Recent trades - updates every 5 seconds
  const { data: trades, error: tradesError } = useQuery({
    queryKey: ["trades", symbol],
    queryFn: () => fetchTrades(symbol),
    enabled: !!symbol,
    refetchInterval: 5000, // 5 seconds
    staleTime: 2000, // 2 seconds
  });

  // Open interest - updates every 30 seconds
  const { data: openInterest } = useQuery({
    queryKey: ["openInterest", symbol],
    queryFn: () => fetchOpenInterest(symbol),
    enabled: !!symbol,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
  });

  // Funding rate - updates every 60 seconds
  const { data: fundingData } = useQuery({
    queryKey: ["fundingRate", symbol],
    queryFn: () => fetchFundingRate(symbol),
    enabled: !!symbol,
    refetchInterval: 60000, // 60 seconds
    staleTime: 30000, // 30 seconds
  });

  return {
    ticker,
    tickerError: tickerError?.message,
    orderBook,
    orderBookError: orderBookError?.message,
    trades,
    tradesError: tradesError?.message,
    openInterest,
    lastFundingRate: fundingData?.lastFundingRate || null,
    nextFundingTime: fundingData?.nextFundingTime || null,
  };
}
