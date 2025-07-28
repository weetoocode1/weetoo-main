import { NextRequest, NextResponse } from "next/server";

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "TRXUSDT",
  "LINKUSDT",
  "MATICUSDT",
  "DOTUSDT",
];

const SYMBOL_CONFIG: Record<string, { name: string }> = {
  BTCUSDT: { name: "Bitcoin" },
  ETHUSDT: { name: "Ethereum" },
  BNBUSDT: { name: "Binance Coin" },
  SOLUSDT: { name: "Solana" },
  XRPUSDT: { name: "XRP" },
  ADAUSDT: { name: "Cardano" },
  DOGEUSDT: { name: "Dogecoin" },
  AVAXUSDT: { name: "Avalanche" },
  TRXUSDT: { name: "TRON" },
  LINKUSDT: { name: "Chainlink" },
  MATICUSDT: { name: "Polygon" },
  DOTUSDT: { name: "Polkadot" },
};

// Binance ticker type
interface BinanceTicker {
  symbol: string;
  priceChangePercent: string;
}

export async function GET(req: NextRequest) {
  try {
    const res = await fetch("https://api.binance.us/api/v3/ticker/24hr");
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Binance data" },
        { status: 500 }
      );
    }
    const tickers: BinanceTicker[] = await res.json();
    const data = tickers
      .filter((t: BinanceTicker) => SYMBOLS.includes(t.symbol))
      .map((t: BinanceTicker) => ({
        symbol: t.symbol.replace("USDT", ""),
        name: SYMBOL_CONFIG[t.symbol]?.name || t.symbol,
        performance: parseFloat(t.priceChangePercent),
      }));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
