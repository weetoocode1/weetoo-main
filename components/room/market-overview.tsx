"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useLatestRoomReset } from "@/hooks/use-room-reset";
import { useTranslations } from "next-intl";

export const TRADER_PNL_KEY = (roomId: string) =>
  `/api/room/${encodeURIComponent(roomId)}/trader-pnl`;
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
  openInterest?: string | null;
  lastFundingRate?: string | null;
  nextFundingTime?: number | null;
}

export function MarketOverview({
  symbol,
  data,
  roomId,
}: {
  symbol: string;
  data: MarketOverviewData;
  roomId: string;
}) {
  const t = useTranslations("room.marketOverview");
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

  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const { data: latestResetData } = useLatestRoomReset(roomId);
  const sinceResetAt = latestResetData?.latest?.reset_at;

  const { data: traderPnl } = useSWR(
    sinceResetAt
      ? `${TRADER_PNL_KEY(roomId)}?since=${encodeURIComponent(sinceResetAt)}`
      : TRADER_PNL_KEY(roomId),
    fetcher
  );

  // Extract trading stats for inline display
  const todayBuyPnl = traderPnl?.today?.buy ?? 0;
  const todaySellPnl = traderPnl?.today?.sell ?? 0;
  const totalBuyPnl = traderPnl?.total?.buy ?? 0;
  const totalSellPnl = traderPnl?.total?.sell ?? 0;

  return (
    <div
      className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full h-full p-4 text-sm  gap-3"
      data-testid="market-overview"
    >
      {/* Left Section: Symbol and Price */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 h-full">
        <div className="flex flex-col items-start px-2">
          <div className="flex items-center gap-1 cursor-pointer hover:bg-zinc-800 p-1 rounded-md">
            <p className="text-sm font-semibold">{symbol}</p>
          </div>
          <p className="text-muted-foreground text-xs whitespace-nowrap">
            {t("usdtFuturesTrading")}
          </p>
        </div>
        {/* separator: horizontal on mobile, vertical on desktop */}
        <div className="block md:hidden h-[1px] w-full bg-border my-1" />
        <div className="hidden md:block h-full w-[1px] bg-border mx-2" />
        <div className="flex flex-col items-start justify-center h-full px-2">
          <p
            data-testid="current-price"
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

      {/* Main Market Data Row */}
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-1 h-full w-full lg:w-auto lg:min-w-0 flex-1 overflow-x-auto lg:overflow-x-visible">
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[90px] lg:min-w-[100px]">
          <p className="text-muted-foreground text-xs">{t("change24h")}</p>
          <p
            className={
              ticker && parseFloat(ticker.priceChange) < 0
                ? "text-red-500 font-semibold text-xs lg:text-sm whitespace-nowrap"
                : "text-green-500 font-semibold text-xs lg:text-sm whitespace-nowrap"
            }
          >
            {ticker && ticker.priceChange && ticker.priceChangePercent
              ? `${parseFloat(ticker.priceChange).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })} (${parseFloat(ticker.priceChangePercent).toFixed(2)}%)`
              : "-"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[90px] lg:min-w-[100px]">
          <p className="text-muted-foreground text-xs">{t("high24h")}</p>
          <p className="text-foreground font-semibold text-xs lg:text-sm whitespace-nowrap">
            {ticker && ticker.highPrice
              ? parseFloat(ticker.highPrice).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "-"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[90px] lg:min-w-[100px]">
          <p className="text-muted-foreground text-xs">{t("low24h")}</p>
          <p className="text-foreground font-semibold text-xs lg:text-sm whitespace-nowrap">
            {ticker && ticker.lowPrice
              ? parseFloat(ticker.lowPrice).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "-"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[100px] lg:min-w-[120px]">
          <p className="text-muted-foreground text-xs">{t("turnover24h")}</p>
          <p className="text-foreground font-semibold text-xs lg:text-sm whitespace-nowrap">
            {ticker && ticker.quoteVolume
              ? parseFloat(ticker.quoteVolume).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "-"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[100px] lg:min-w-[120px]">
          <p className="text-muted-foreground text-xs">{t("volume24h")}</p>
          <p className="text-foreground font-semibold text-xs lg:text-sm whitespace-nowrap">
            {ticker && ticker.volume
              ? parseFloat(ticker.volume).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "-"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[100px] lg:min-w-[120px]">
          <p className="text-muted-foreground text-xs">
            {t("openInterest24h")}
          </p>
          <p className="text-foreground font-semibold text-xs lg:text-sm whitespace-nowrap">
            {openInterest
              ? parseFloat(openInterest).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "-"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[120px] lg:min-w-[140px]">
          <p className="text-muted-foreground text-xs">{t("fundingTime")}</p>
          <div className="flex items-center gap-1">
            <p
              className={
                fundingRate == null
                  ? "text-muted-foreground font-semibold text-xs lg:text-sm"
                  : parseFloat(fundingRate) >= 0
                  ? "text-green-500 font-semibold text-xs lg:text-sm"
                  : "text-red-500 font-semibold text-xs lg:text-sm"
              }
            >
              {fundingRate == null
                ? "--"
                : `${parseFloat(fundingRate) >= 0 ? "+" : ""}${(
                    parseFloat(fundingRate) * 100
                  ).toFixed(4)}%`}
            </p>
            <p className="text-foreground font-semibold text-xs lg:text-sm">
              {timeLeft}
            </p>
            <Info size={14} className="text-muted-foreground lg:w-4 lg:h-4" />
          </div>
        </div>

        {/* Today Records - Integrated into main row */}
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[140px] lg:min-w-[160px]">
          <p className="text-muted-foreground text-xs">{t("todayRecords")}</p>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">{t("buy")}</span>
              <span
                className={`text-xs lg:text-sm font-semibold whitespace-nowrap ${
                  todayBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {todayBuyPnl >= 0 ? "↑" : "↓"} {todayBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">{t("sell")}</span>
              <span
                className={`text-xs lg:text-sm font-semibold whitespace-nowrap ${
                  todaySellPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {todaySellPnl >= 0 ? "↑" : "↓"} {todaySellPnl.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Total Records - Integrated into main row */}
        <div className="flex flex-col items-center justify-center px-1 lg:px-2 min-w-[140px] lg:min-w-[160px]">
          <p className="text-muted-foreground text-xs">{t("totalRecords")}</p>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">{t("buy")}</span>
              <span
                className={`text-xs lg:text-sm font-semibold whitespace-nowrap ${
                  totalBuyPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalBuyPnl >= 0 ? "↑" : "↓"} {totalBuyPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground">{t("sell")}</span>
              <span
                className={`text-xs lg:text-sm font-semibold whitespace-nowrap ${
                  totalSellPnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalSellPnl >= 0 ? "↑" : "↓"} {totalSellPnl.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
