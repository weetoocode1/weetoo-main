"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";

interface TickerData {
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
  volume: string;
}

interface MarketOverviewData {
  ticker?: TickerData;
  openInterest?: string;
  lastFundingRate?: string;
  nextFundingTime?: number;
}

export function MarketOverview({
  symbol,
  data,
}: {
  symbol: string;
  data: MarketOverviewData;
}) {
  const ticker = data?.ticker;
  const openInterest = data?.openInterest;
  const fundingRate = data?.lastFundingRate;
  const nextFundingTime = data?.nextFundingTime;

  // Countdown logic for next funding time
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");
  useEffect(() => {
    if (!nextFundingTime) return;
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, nextFundingTime - now);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextFundingTime]);

  return (
    <div className="flex items-center justify-between w-full h-full p-4 text-sm select-none">
      <div className="flex items-center gap-2 h-full">
        <div className="flex flex-col items-start px-2">
          <div className="flex items-center gap-1 cursor-pointer hover:bg-zinc-800 p-1 rounded-md">
            <p className="text-sm font-semibold">{symbol}</p>
          </div>
          <p className="text-muted-foreground text-xs whitespace-nowrap">
            USDT Futures Trading
          </p>
        </div>
        <div className="h-full w-[1px] bg-border mx-2"></div>
        <div className="flex flex-col items-start justify-center h-full px-2">
          <p
            className={
              ticker && parseFloat(ticker.priceChange) < 0
                ? "text-red-500 text-base font-semibold min-w-[110px]"
                : "text-green-500 text-base font-semibold min-w-[110px]"
            }
          >
            {ticker && ticker.lastPrice
              ? parseFloat(ticker.lastPrice).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "-"}
          </p>
          <p className="text-muted-foreground text-xs">
            {ticker && ticker.lastPrice
              ? `$${parseFloat(ticker.lastPrice).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}`
              : "-"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 h-full">
        <div className="flex flex-col items-center justify-center px-2 min-w-[100px]">
          <p className="text-muted-foreground text-xs">Change (24H)</p>
          <p
            className={
              ticker && parseFloat(ticker.priceChange) < 0
                ? "text-red-500 font-semibold min-w-[110px] text-[0.77rem]"
                : "text-green-500 font-semibold min-w-[110px] text-[0.77rem]"
            }
          >
            {ticker && ticker.priceChange && ticker.priceChangePercent
              ? `${parseFloat(ticker.priceChange).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })} (${parseFloat(ticker.priceChangePercent).toFixed(2)}%)`
              : "-"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-2 min-w-[100px]">
          <p className="text-muted-foreground text-xs">High (24H)</p>
          <div className="flex justify-center items-center w-full">
            <p className="text-foreground font-semibold min-w-[110px] text-center">
              {ticker && ticker.highPrice
                ? parseFloat(ticker.highPrice).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-2 min-w-[100px]">
          <p className="text-muted-foreground text-xs">Low (24H)</p>
          <div className="flex justify-center items-center w-full">
            <p className="text-foreground font-semibold min-w-[110px] text-center">
              {ticker && ticker.lowPrice
                ? parseFloat(ticker.lowPrice).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-2 min-w-[150px]">
          <p className="text-muted-foreground text-xs">Turnover (24H)</p>
          <div className="flex justify-center items-center w-full">
            <p className="text-foreground font-semibold min-w-[130px] text-center">
              {ticker && ticker.quoteVolume
                ? parseFloat(ticker.quoteVolume).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-2 min-w-[150px]">
          <p className="text-muted-foreground text-xs">Volume (24H)</p>
          <div className="flex justify-center items-center w-full">
            <p className="text-foreground font-semibold min-w-[130px] text-center">
              {ticker && ticker.volume
                ? parseFloat(ticker.volume).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-2 min-w-[150px]">
          <p className="text-muted-foreground text-xs">Open Int. (24H)</p>
          <div className="flex justify-center items-center w-full">
            <p className="text-foreground font-semibold min-w-[130px] text-center">
              {openInterest
                ? parseFloat(openInterest).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-2 min-w-[180px]">
          <p className="text-muted-foreground text-xs">Funding/Time</p>
          <div className="flex items-center gap-2">
            <p
              className={
                fundingRate == null
                  ? "text-muted-foreground font-semibold"
                  : parseFloat(fundingRate) >= 0
                  ? "text-green-500 font-semibold"
                  : "text-red-500 font-semibold"
              }
            >
              {fundingRate == null
                ? "--"
                : `${parseFloat(fundingRate) >= 0 ? "+" : ""}${(
                    parseFloat(fundingRate) * 100
                  ).toFixed(4)}%`}
            </p>
            <p className="text-foreground font-semibold">{timeLeft}</p>
            <Info size={16} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
