"use client";

import useSWR from "swr";
import { InstrumentCard } from "./instrument-card";

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

type SymbolData = {
  symbol: string;
  ticker: unknown;
  klines: unknown[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CryptoDashboardClient() {
  const symbolsParam = SYMBOLS.join(",");
  const { data, isLoading } = useSWR(
    `/api/binance-multi?symbols=${symbolsParam}`,
    fetcher,
    { refreshInterval: 10000, revalidateOnFocus: false }
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {SYMBOLS.map((symbol, index) => {
        const symbolData = data?.data?.find(
          (d: SymbolData) => d.symbol === symbol
        );
        return (
          <InstrumentCard
            key={symbol}
            symbol={symbol}
            index={index}
            ticker={symbolData?.ticker}
            klines={symbolData?.klines}
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
}
