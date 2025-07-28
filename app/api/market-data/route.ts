import { NextRequest, NextResponse } from "next/server";

interface MarketDataResponse {
  orderBook?: unknown;
  orderBookError?: string;
  trades?: unknown;
  tradesError?: string;
  ticker?: {
    lastPrice: string;
    priceChange: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    quoteVolume: string;
    volume: string;
  };
  tickerError?: string;
  openInterest?: string;
  openInterestError?: string;
  lastFundingRate?: string;
  nextFundingTime?: number;
  fundingError?: string;
  candles?: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  candlesError?: string;
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const include = searchParams.get("include") || "all"; // "orderbook", "trades", "ticker", "openInterest", "candles", or "all"
  const interval = searchParams.get("interval") || "1d"; // default to 1h if not provided

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing symbol parameter" },
      { status: 400 }
    );
  }

  let orderBook, trades, ticker, candles;
  const responses: MarketDataResponse = {};
  const fetches = [];

  if (include === "orderbook" || include === "all") {
    fetches.push(
      fetch(`https://api.binance.us/api/v3/depth?symbol=${symbol}&limit=6`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch order book");
          orderBook = await res.json();
          responses.orderBook = orderBook;
        })
        .catch((err) => {
          responses.orderBookError = err.message;
        })
    );
  }

  if (include === "trades" || include === "all") {
    fetches.push(
      fetch(`https://api.binance.us/api/v3/trades?symbol=${symbol}&limit=30`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch trades");
          trades = await res.json();
          responses.trades = trades;
        })
        .catch((err) => {
          responses.tradesError = err.message;
        })
    );
  }

  if (include === "ticker" || include === "all") {
    fetches.push(
      fetch(`https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch ticker");
          const t = await res.json();
          ticker = {
            lastPrice: t.lastPrice,
            priceChange: t.priceChange,
            priceChangePercent: t.priceChangePercent,
            highPrice: t.highPrice,
            lowPrice: t.lowPrice,
            quoteVolume: t.quoteVolume,
            volume: t.volume,
          };
          responses.ticker = ticker;
        })
        .catch((err) => {
          responses.tickerError = err.message;
        })
    );
  }

  // klines/candles fetch
  if (include === "candles" || include === "all") {
    fetches.push(
      fetch(
        `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}`
      )
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch candles");
          const klines = await res.json();
          // Transform to { time, open, high, low, close }
          candles = (klines as BinanceKline[]).map((k) => ({
            time: Math.floor(k[0] / 1000), // open time in seconds
            open: Number(k[1]),
            high: Number(k[2]),
            low: Number(k[3]),
            close: Number(k[4]),
          }));
          responses.candles = candles;
        })
        .catch((err) => {
          responses.candlesError = err.message;
        })
    );
  }

  await Promise.all(fetches);
  return NextResponse.json(responses);
}
