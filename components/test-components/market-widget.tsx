import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTickerData } from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { InfoIcon, ZapIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";

// Consistent number formatting function to prevent hydration mismatches
const formatNumber = (num: number, decimals: number = 2): string => {
  // Handle NaN, undefined, or invalid numbers
  if (isNaN(num) || !isFinite(num)) {
    return "--";
  }

  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Truncate to 4 decimals for funding rate display
const formatPercent4 = (num: number): string => {
  if (isNaN(num) || !isFinite(num)) return "--";
  const truncated = Math.floor(num * 10000) / 10000;
  return truncated.toFixed(4);
};

interface MarketWidgetProps {
  symbol?: Symbol;
}

export function MarketWidget({ symbol }: MarketWidgetProps) {
  // Get real-time ticker data
  const tickerData = useTickerData(symbol || "BTCUSDT");

  // Resolve human-friendly asset name and label from config
  const { assetName } = useMemo(() => {
    const fallback = {
      assetName: (symbol || "BTCUSDT").replace(/USDT$/, ""),
      pairLabel: symbol || "BTCUSDT",
    };
    const found = TRADING_SYMBOLS.find(
      (s) => s.value === (symbol || "BTCUSDT")
    );
    if (!found) return fallback;
    return {
      assetName: found.name || fallback.assetName,
      pairLabel: found.label || fallback.pairLabel,
    };
  }, [symbol]);

  // Store last known values to prevent flickering
  const [lastKnownValues, setLastKnownValues] = useState({
    indexPrice: 0,
    markPrice: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    turnover24h: 0,
    openInterest: 0,
    fundingRate: 0,
    fundingRateLastNonZero: 0,
    fundingRateSeen: false,
    change24hAmount: 0,
    change24hPercent: 0,
    nextFundingTimeMs: 0,
  });

  // ===== helpers =====
  const getNextFundingTimeMs = (): number => {
    const intervalMs = 8 * 60 * 60 * 1000; // default 8h funding interval
    const now = Date.now();
    const next = Math.floor(now / intervalMs) * intervalMs + intervalMs;
    return next;
  };

  // Calculate derived values (optimized)
  const {
    currentPrice,
    indexPrice,
    markPrice,
    changePercent24h,
    change24h,
    high24h,
    low24h,
    turnover24h,
    volume24h,
    openInterest,
    fundingRate,
  } = (() => {
    const parse = (v?: string): number => {
      if (!v || v === "0") return 0;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const parsePct = (v?: string): number => (v ? parse(v) : 0);

    const last = parse(tickerData?.lastPrice);
    const idx = parse(tickerData?.indexPrice);
    const mark = parse(tickerData?.markPrice);
    const pct = parsePct(tickerData?.price24hPcnt);
    const prev = parse(tickerData?.prevPrice24h);

    const changeFromPrev = prev > 0 && last > 0 ? last - prev : 0;
    const changeFromPct = last > 0 && pct !== 0 ? last * (pct / (1 + pct)) : 0;
    const finalChange =
      changeFromPrev !== 0
        ? changeFromPrev
        : changeFromPct !== 0
        ? changeFromPct
        : parse(tickerData?.change24h);

    const fr = parse(tickerData?.fundingRate) * 100; // percent

    return {
      currentPrice: last,
      indexPrice: idx,
      markPrice: mark,
      changePercent24h: pct,
      change24h: finalChange,
      high24h: parse(tickerData?.highPrice24h),
      low24h: parse(tickerData?.lowPrice24h),
      turnover24h: parse(tickerData?.turnover24h),
      volume24h: parse(tickerData?.volume24h),
      openInterest: parse(tickerData?.openInterest),
      fundingRate: fr,
    };
  })();

  // Real-time countdown state
  const [countdown, setCountdown] = useState("00:00:00");

  // Cache last-known values and funding timestamp (single effect)
  useEffect(() => {
    if (!tickerData) return;
    setLastKnownValues((prev) => {
      const nextTs = (() => {
        if (tickerData.nextFundingTime) {
          const ts = new Date(tickerData.nextFundingTime).getTime();
          if (isFinite(ts) && ts > 0) return ts;
        }
        return prev.nextFundingTimeMs > 0
          ? prev.nextFundingTimeMs
          : getNextFundingTimeMs();
      })();

      const fundingSrc =
        tickerData.predictedFundingRate ?? tickerData.fundingRate;
      const frParsed = fundingSrc ? parseFloat(fundingSrc) * 100 : NaN;
      const frValid = Number.isFinite(frParsed);

      return {
        ...prev,
        indexPrice: indexPrice > 0 ? indexPrice : prev.indexPrice,
        markPrice: markPrice > 0 ? markPrice : prev.markPrice,
        high24h: high24h > 0 ? high24h : prev.high24h,
        low24h: low24h > 0 ? low24h : prev.low24h,
        volume24h: volume24h > 0 ? volume24h : prev.volume24h,
        turnover24h: turnover24h > 0 ? turnover24h : prev.turnover24h,
        openInterest: openInterest > 0 ? openInterest : prev.openInterest,
        fundingRate: frValid ? frParsed : prev.fundingRate,
        fundingRateLastNonZero:
          frValid && frParsed !== 0 ? frParsed : prev.fundingRateLastNonZero,
        fundingRateSeen: frValid ? true : prev.fundingRateSeen,
        change24hAmount: Number.isFinite(change24h)
          ? change24h
          : prev.change24hAmount,
        change24hPercent: Number.isFinite(changePercent24h)
          ? changePercent24h
          : prev.change24hPercent,
        nextFundingTimeMs: nextTs,
      };
    });
  }, [
    tickerData,
    indexPrice,
    markPrice,
    high24h,
    low24h,
    volume24h,
    turnover24h,
    openInterest,
    change24h,
    changePercent24h,
  ]);

  // Update countdown every second using cached nextFundingTimeMs
  useEffect(() => {
    const updateCountdown = () => {
      let target = lastKnownValues.nextFundingTimeMs;
      if (!target || target <= 0) {
        target = getNextFundingTimeMs();
        setLastKnownValues((prev) => ({ ...prev, nextFundingTimeMs: target }));
      }

      const now = Date.now();
      let diff = target - now;

      if (diff <= 0) {
        // At boundary: opportunistically refresh fundingRate from ticker if present
        if (tickerData?.fundingRate) {
          const parsed = parseFloat(tickerData.fundingRate) * 100;
          if (Number.isFinite(parsed)) {
            setLastKnownValues((prev) => ({ ...prev, fundingRate: parsed }));
          }
        }
        // Then roll forward to next interval
        target = getNextFundingTimeMs();
        setLastKnownValues((prev) => ({ ...prev, nextFundingTimeMs: target }));
        diff = target - now;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastKnownValues.nextFundingTimeMs]);

  // Determine if we have valid data to display
  const hasValidData =
    tickerData &&
    tickerData.lastPrice !== "0" &&
    tickerData.symbol !== "" &&
    tickerData.lastPrice !== "" &&
    parseFloat(tickerData.lastPrice) > 0;

  // Determine if current price color is up/down (Use tickDirection from Bybit)
  const isPositiveChange = tickerData?.tickDirection
    ? tickerData.tickDirection === "PlusTick"
    : change24h >= 0; // Fallback only for current price color

  // For 24H Change display, follow Bybit: color/sign from 24h percent
  // const is24hPositive = changePercent24h >= 0;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only prevent propagation for interactive elements, not the entire widget
    if (e.target !== e.currentTarget) {
      e.stopPropagation();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Allow normal click interactions
    e.stopPropagation();
  };

  return (
    <div
      className="w-full min-h-auto lg:min-h-[60px] flex flex-col lg:flex-row items-start lg:items-center border border-border rounded-none text-sm px-3 py-2 lg:py-0 bg-background market-widget-interactive"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{ pointerEvents: "auto" }}
    >
      {/* Desktop Layout - Horizontal */}
      <div className="hidden lg:flex items-center w-full">
        {/* Trading Pair Section */}
        <div className="flex items-center gap-3">
          {/* Symbol and Type */}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground uppercase">
              {symbol}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                USDT Perpetual
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon
                      className="w-3 h-3 text-orange-500 cursor-pointer"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    <p className="text-xs">
                      {assetName} {"USDT Perpetual"}, using USDT as collateral
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Current Price */}
        <div className="flex flex-col ml-6 w-fit">
          <span
            className={`text-base font-bold w-fit transition-colors duration-300 tabular-nums ${
              isPositiveChange ? "text-profit" : "text-loss"
            }`}
          >
            {hasValidData ? formatNumber(currentPrice) : "--"}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-foreground border-b border-dotted border-muted-foreground w-fit transition-colors duration-300 cursor-help tabular-nums">
                  {hasValidData &&
                  (markPrice > 0 || lastKnownValues.markPrice > 0)
                    ? formatNumber(
                        markPrice > 0 ? markPrice : lastKnownValues.markPrice
                      )
                    : "--"}
                </span>
              </TooltipTrigger>
              <TooltipContent
                className="max-w-[300px] w-full"
                side="bottom"
                align="center"
              >
                <p className="text-xs">
                  Mark price is derived by index price and funding rate, and
                  reflects the fair market price. Liquidation is triggered by
                  mark price.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Market Metrics */}
        <div className="flex items-center gap-8 ml-8">
          {/* Index Price */}
          <div className="flex flex-col w-fit">
            <span className="text-xs text-muted-foreground">Index Price</span>
            <span className="text-xs font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData &&
              (indexPrice > 0 || lastKnownValues.indexPrice > 0)
                ? formatNumber(
                    indexPrice > 0 ? indexPrice : lastKnownValues.indexPrice
                  )
                : "--"}
            </span>
          </div>

          {/* 24H Change */}
          <div className="flex flex-col w-fit">
            <span className="text-xs text-muted-foreground">24H Change %</span>
            <span
              className={`text-xs font-medium transition-colors duration-300 tabular-nums ${
                (lastKnownValues.change24hPercent !== 0
                  ? lastKnownValues.change24hPercent
                  : changePercent24h) >= 0
                  ? "text-profit"
                  : "text-loss"
              }`}
            >
              {hasValidData
                ? `${
                    (lastKnownValues.change24hPercent !== 0
                      ? lastKnownValues.change24hPercent
                      : changePercent24h) < 0
                      ? "-"
                      : ""
                  }${formatNumber(
                    Math.abs(
                      lastKnownValues.change24hAmount !== 0
                        ? lastKnownValues.change24hAmount
                        : change24h
                    )
                  )} (${
                    (lastKnownValues.change24hPercent !== 0
                      ? lastKnownValues.change24hPercent
                      : changePercent24h) < 0
                      ? "-"
                      : ""
                  }${Math.abs(
                    (lastKnownValues.change24hPercent !== 0
                      ? lastKnownValues.change24hPercent
                      : changePercent24h) * 100
                  ).toFixed(2)}%)`
                : "--"}
            </span>
          </div>

          {/* 24H High */}
          <div className="flex flex-col w-fit">
            <span className="text-xs text-muted-foreground">24H High</span>
            <span className="text-xs font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData && (high24h > 0 || lastKnownValues.high24h > 0)
                ? formatNumber(high24h > 0 ? high24h : lastKnownValues.high24h)
                : "--"}
            </span>
          </div>

          {/* 24H Low */}
          <div className="flex flex-col w-fit">
            <span className="text-xs text-muted-foreground">24H Low</span>
            <span className="text-xs font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData && (low24h > 0 || lastKnownValues.low24h > 0)
                ? formatNumber(low24h > 0 ? low24h : lastKnownValues.low24h)
                : "--"}
            </span>
          </div>

          {/* 24H Volume */}
          <div className="flex flex-col w-fit">
            <span className="text-xs text-muted-foreground">24H Volume</span>
            <span className="text-xs font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData && (volume24h > 0 || lastKnownValues.volume24h > 0)
                ? formatNumber(
                    volume24h > 0 ? volume24h : lastKnownValues.volume24h,
                    2
                  )
                : "--"}
            </span>
          </div>

          {/* 24H Turnover */}
          <div className="flex flex-col w-fit">
            <span className="text-xs text-muted-foreground">
              24H Turnover(USDT)
            </span>
            <span className="text-xs font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData &&
              (turnover24h > 0 || lastKnownValues.turnover24h > 0)
                ? formatNumber(
                    turnover24h > 0 ? turnover24h : lastKnownValues.turnover24h
                  )
                : "--"}
            </span>
          </div>

          {/* Open Interest */}
          <div className="flex flex-col w-fit">
            <span className="text-xs text-muted-foreground">Open Interest</span>
            <span className="text-xs font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData &&
              (openInterest > 0 || lastKnownValues.openInterest > 0)
                ? formatNumber(
                    openInterest > 0
                      ? openInterest
                      : lastKnownValues.openInterest,
                    3
                  )
                : "--"}
            </span>
          </div>

          {/* Funding Rate / Countdown */}
          <div className="flex flex-col w-fit">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground border-b border-dotted border-muted-foreground">
                Funding Rate
              </span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs text-muted-foreground border-b border-dotted border-muted-foreground">
                Countdown
              </span>
            </div>
            <div className="flex items-center gap-1">
              <ZapIcon className="w-3 h-3 text-orange-500 transition-colors duration-300" />
              <span className="text-xs font-medium text-orange-500 transition-colors duration-300 tabular-nums">
                {lastKnownValues.fundingRateSeen ||
                lastKnownValues.fundingRateLastNonZero !== 0
                  ? `${formatPercent4(
                      fundingRate !== 0
                        ? fundingRate
                        : lastKnownValues.fundingRate !== 0
                        ? lastKnownValues.fundingRate
                        : lastKnownValues.fundingRateLastNonZero
                    )}%`
                  : "--"}
              </span>
              <span className="text-xs text-foreground">/</span>
              <span className="text-xs font-medium text-foreground transition-colors duration-300">
                {lastKnownValues.nextFundingTimeMs > 0 ? countdown : "--"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout - Stacked */}
      <div className="flex flex-col lg:hidden w-full gap-3">
        {/* Top Row: Symbol and Price */}
        <div className="flex items-center justify-between w-full">
          {/* Trading Pair Section */}
          <div className="flex items-center gap-2">
            {/* BTC Icon */}
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>

            {/* Symbol and Type */}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground uppercase">
                {symbol}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  USDT Perpetual
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon
                        className="w-3 h-3 text-orange-500 cursor-pointer"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                      <p className="text-xs">
                        {assetName} {"USDT Perpetual"}, using USDT as collateral
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Current Price */}
          <div className="flex flex-col items-end">
            <span
              className={`text-lg font-bold transition-colors duration-300 tabular-nums ${
                isPositiveChange ? "text-profit" : "text-loss"
              }`}
            >
              {hasValidData ? formatNumber(currentPrice) : "--"}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-foreground border-b border-dotted border-muted-foreground transition-colors duration-300 cursor-help tabular-nums">
                    {hasValidData &&
                    (markPrice > 0 || lastKnownValues.markPrice > 0)
                      ? formatNumber(
                          markPrice > 0 ? markPrice : lastKnownValues.markPrice
                        )
                      : "--"}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-[300px] w-full"
                  side="bottom"
                  align="center"
                >
                  <p className="text-xs">
                    Mark price is derived by index price and funding rate, and
                    reflects the fair market price. Liquidation is triggered by
                    mark price.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Middle Row: Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {/* 24H Change */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">24H Change</span>
            <span
              className={`text-sm font-medium transition-colors duration-300 tabular-nums ${
                (lastKnownValues.change24hPercent !== 0
                  ? lastKnownValues.change24hPercent
                  : changePercent24h) >= 0
                  ? "text-profit"
                  : "text-loss"
              }`}
            >
              {hasValidData
                ? `${
                    (lastKnownValues.change24hPercent !== 0
                      ? lastKnownValues.change24hPercent
                      : changePercent24h) < 0
                      ? "-"
                      : ""
                  }${Math.abs(
                    (lastKnownValues.change24hPercent !== 0
                      ? lastKnownValues.change24hPercent
                      : changePercent24h) * 100
                  ).toFixed(2)}%`
                : "--"}
            </span>
          </div>

          {/* 24H High */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">24H High</span>
            <span className="text-sm font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData && (high24h > 0 || lastKnownValues.high24h > 0)
                ? formatNumber(high24h > 0 ? high24h : lastKnownValues.high24h)
                : "--"}
            </span>
          </div>

          {/* 24H Low */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">24H Low</span>
            <span className="text-sm font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData && (low24h > 0 || lastKnownValues.low24h > 0)
                ? formatNumber(low24h > 0 ? low24h : lastKnownValues.low24h)
                : "--"}
            </span>
          </div>
        </div>

        {/* Bottom Row: Additional Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Index Price */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Index Price</span>
            <span className="text-sm font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData &&
              (indexPrice > 0 || lastKnownValues.indexPrice > 0)
                ? formatNumber(
                    indexPrice > 0 ? indexPrice : lastKnownValues.indexPrice
                  )
                : "--"}
            </span>
          </div>

          {/* Volume */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">24H Volume</span>
            <span className="text-sm font-medium text-foreground transition-colors duration-300 tabular-nums">
              {hasValidData && (volume24h > 0 || lastKnownValues.volume24h > 0)
                ? formatNumber(
                    volume24h > 0 ? volume24h : lastKnownValues.volume24h,
                    2
                  )
                : "--"}
            </span>
          </div>
        </div>

        {/* Funding Rate Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ZapIcon className="w-3 h-3 text-orange-500 transition-colors duration-300" />
            <span className="text-xs text-muted-foreground">Funding Rate</span>
            <span className="text-xs font-medium text-orange-500 transition-colors duration-300 tabular-nums">
              {lastKnownValues.fundingRateSeen ||
              lastKnownValues.fundingRateLastNonZero !== 0
                ? `${formatPercent4(
                    fundingRate !== 0
                      ? fundingRate
                      : lastKnownValues.fundingRate !== 0
                      ? lastKnownValues.fundingRate
                      : lastKnownValues.fundingRateLastNonZero
                  )}%`
                : "--"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Next Funding</span>
            <span className="text-xs font-medium text-foreground transition-colors duration-300">
              {lastKnownValues.nextFundingTimeMs > 0 ? countdown : "--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
