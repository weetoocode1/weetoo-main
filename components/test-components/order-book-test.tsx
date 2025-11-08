"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useOrderBookData,
  useTickerData,
  useTradeData,
} from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { MoreHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  startTransition,
} from "react";

// Consistent number formatting function to prevent hydration mismatches
const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Type definitions for order book data
interface OrderBookLevel {
  price: number;
  qty: number;
  total?: number;
  size?: number;
  totalValue?: number;
  width?: string;
  Id?: number;
  side?: string;
  symbol?: string;
  currentValue?: number;
  inc?: boolean;
}

interface MergedOrderBook {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

interface OrderBookTestProps {
  symbol?: Symbol;
}

export function OrderBookTest({ symbol }: OrderBookTestProps) {
  const t = useTranslations("orderBook.test");
  const depth = 50;
  const currentSymbol = symbol || "BTCUSDT";
  const ob = useOrderBookData(currentSymbol, depth);
  const ticker = useTickerData(currentSymbol);
  const trades = useTradeData(currentSymbol);
  const [activeTab, setActiveTab] = useState<"orderbook" | "trades">(
    "orderbook"
  );
  // const [precision, setPrecision] = useState("0.01");
  const [displayMode, setDisplayMode] = useState<
    "composite" | "left-red" | "left-green"
  >("composite");
  // Derive base asset (e.g., BTC from BTCUSDT)
  const baseAsset = useMemo(
    () => currentSymbol.replace(/USDT$/i, "").toUpperCase(),
    [currentSymbol]
  );
  const [totalUnit, setTotalUnit] = useState<"USDT" | string>(baseAsset);
  useEffect(() => {
    setTotalUnit(baseAsset);
  }, [baseAsset]);

  // Cache for last known values to prevent flickering
  const [lastKnownValues, setLastKnownValues] = useState({
    currentPrice: 0,
    markPrice: 0,
    indexPrice: 0,
    change24hAmount: 0,
    change24hPercent: 0,
    fundingRate: 0,
    nextFundingTimeMs: 0,
  });

  // Helper: format with K/M suffix
  const formatWithK = (num: number, decimals: number = 3): string => {
    if (!Number.isFinite(num)) return "0.000";
    const abs = Math.abs(num);
    if (abs >= 1_000_000) return (num / 1_000_000).toFixed(decimals) + "M";
    if (abs >= 1_000) return (num / 1_000).toFixed(decimals) + "K";
    return num.toFixed(decimals);
  };

  // Helper: convert total based on unit for a row
  const formatTotalDisplay = (row: OrderBookLevel): string => {
    const totalBtc = row.total || 0;
    const price = row.price || 0;
    const value = totalUnit === baseAsset ? totalBtc : totalBtc * price; // convert to USDT using row price
    return formatWithK(value);
  };

  // Prevent drag events on interactive elements
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const emitSetLimitPrice = (price: number) => {
    if (!Number.isFinite(price) || price <= 0) return;
    const ev = new CustomEvent("set-limit-price", { detail: { price } });
    window.dispatchEvent(ev);
  };

  // Maintain local merged order book (snapshot + deltas)
  const asksMapRef = useRef<Map<number, number>>(new Map());
  const bidsMapRef = useRef<Map<number, number>>(new Map());
  const [mergedBook, setMergedBook] = useState<MergedOrderBook>({
    asks: [],
    bids: [],
  });
  const processingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const hasReceivedSnapshotRef = useRef(false);

  // No more debouncing - unified throttling handled in bybit-clien?
  // Debug: log raw websocket payloads to verify flow
  // useEffect(() => {
  //   if (ob) {
  //     console.log("[WS] orderbook payload", {
  //       asksLen: Array.isArray(ob.asks) ? ob.asks.length : 0,
  //       bidsLen: Array.isArray(ob.bids) ? ob.bids.length : 0,
  //       sampleAsk: Array.isArray(ob.asks) && ob.asks[0],
  //       sampleBid: Array.isArray(ob.bids) && ob.bids[0],
  //       type: ob.type,
  //       symbol: ob.symbol,
  //     });
  //   }
  // }, [ob]);

  // useEffect(() => {
  //   if (ticker) {
  //     console.log("[WS] ticker payload", ticker);
  //   }
  // }, [ticker]);

  // useEffect(() => {
  //   if (trades) {
  //     // console.log("[WS] trades payload", {
  //     //   count: trades.length,
  //     //   trades: trades.slice(0, 3),
  //     //   sampleTrade: trades[0],
  //     //   sampleTradeKeys: trades[0] ? Object.keys(trades[0]) : [],
  //     // });
  //   } else {
  //     // console.log("[WS] No trades data received yet");
  //   }
  // }, [trades]);

  // Optimized build function - minimize allocations and calculations
  const buildOrderBookLevels = useCallback(
    (map: Map<number, number>, asc: boolean) => {
      const size = map.size;
      if (size === 0) return [];

      const entries: Array<[number, number]> = [];
      entries.length = size;
      let idx = 0;
      for (const [price, qty] of map.entries()) {
        if (qty > 0 && price > 0) {
          entries[idx++] = [price, qty];
        }
      }
      entries.length = idx;

      if (idx === 0) return [];

      entries.sort((a, b) => (asc ? a[0] - b[0] : b[0] - a[0]));
      const limit = Math.min(depth, idx);

      let cum = 0;
      let maxTotal = 0;
      for (let i = 0; i < limit; i++) {
        maxTotal += entries[i][1];
      }

      const result: OrderBookLevel[] = [];
      result.length = limit;
      const maxTotalInv = maxTotal > 0 ? 100 / maxTotal : 0;

      for (let i = 0; i < limit; i++) {
        const price = entries[i][0];
        const qty = entries[i][1];
        const total = (cum += qty);
        const currentValue = price * qty;
        const totalValue = price * total;
        const width = `${total * maxTotalInv}%`;

        result[i] = {
          Id: price,
          price: price,
          qty: qty,
          side: asc ? "Sell" : "Buy",
          size: qty,
          symbol: currentSymbol,
          total: total,
          currentValue: currentValue,
          totalValue: totalValue,
          inc: true,
          width: width,
        };
      }
      return result;
    },
    [depth, currentSymbol]
  );

  useEffect(() => {
    if (!ob) return;

    const isSnapshot = ob.type === "snapshot";

    if (isSnapshot) {
      hasReceivedSnapshotRef.current = true;
      asksMapRef.current.clear();
      bidsMapRef.current.clear();

      const asks = ob.asks || [];
      const asksLength = asks.length;
      for (let i = 0; i < asksLength; i++) {
        const l = asks[i];
        if (Array.isArray(l) && l.length >= 2) {
          const price = parseFloat(l[0]);
          const qty = parseFloat(l[1]);
          if (
            Number.isFinite(price) &&
            Number.isFinite(qty) &&
            qty > 0 &&
            price > 0
          ) {
            asksMapRef.current.set(price, qty);
          }
        } else if (l && typeof l === "object" && !Array.isArray(l)) {
          const lObj = l as unknown as Record<string, unknown>;
          const price = parseFloat(String(lObj?.price || "0"));
          const qty = parseFloat(String(lObj?.qty || "0"));
          if (
            Number.isFinite(price) &&
            Number.isFinite(qty) &&
            qty > 0 &&
            price > 0
          ) {
            asksMapRef.current.set(price, qty);
          }
        }
      }

      const bids = ob.bids || [];
      const bidsLength = bids.length;
      for (let i = 0; i < bidsLength; i++) {
        const l = bids[i];
        if (Array.isArray(l) && l.length >= 2) {
          const price = parseFloat(l[0]);
          const qty = parseFloat(l[1]);
          if (
            Number.isFinite(price) &&
            Number.isFinite(qty) &&
            qty > 0 &&
            price > 0
          ) {
            bidsMapRef.current.set(price, qty);
          }
        } else if (l && typeof l === "object" && !Array.isArray(l)) {
          const lObj = l as unknown as Record<string, unknown>;
          const price = parseFloat(String(lObj?.price || "0"));
          const qty = parseFloat(String(lObj?.qty || "0"));
          if (
            Number.isFinite(price) &&
            Number.isFinite(qty) &&
            qty > 0 &&
            price > 0
          ) {
            bidsMapRef.current.set(price, qty);
          }
        }
      }

      // Process snapshot immediately without batching
      const newMergedBook = {
        asks: buildOrderBookLevels(asksMapRef.current, true),
        bids: buildOrderBookLevels(bidsMapRef.current, false),
      };
      setMergedBook(newMergedBook);
    } else {
      if (processingRef.current) return;

      const apply = (
        side: "asks" | "bids",
        levels: Record<string, unknown>[]
      ) => {
        const mapRef =
          side === "asks" ? asksMapRef.current : bidsMapRef.current;
        for (let i = 0; i < levels.length; i++) {
          const l = levels[i];
          const isTuple = Array.isArray(l);
          const price = isTuple
            ? parseFloat(l[0] as string)
            : parseFloat((l as Record<string, unknown>)?.price as string);
          const qty = isTuple
            ? parseFloat(l[1] as string)
            : parseFloat((l as Record<string, unknown>)?.qty as string);
          if (!Number.isFinite(price) || !Number.isFinite(qty)) continue;

          if (qty === 0) {
            mapRef.delete(price);
          } else {
            mapRef.set(price, qty);
          }
        }
      };

      apply("asks", (ob.asks || []) as unknown as Record<string, unknown>[]);
      apply("bids", (ob.bids || []) as unknown as Record<string, unknown>[]);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      processingRef.current = true;
      rafRef.current = requestAnimationFrame(() => {
        startTransition(() => {
          const newMergedBook = {
            asks: buildOrderBookLevels(asksMapRef.current, true),
            bids: buildOrderBookLevels(bidsMapRef.current, false),
          };
          setMergedBook(newMergedBook);
          processingRef.current = false;
        });
      });
    }
  }, [ob, buildOrderBookLevels]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      processingRef.current = false;
    };
  }, []);

  // Update lastKnownValues when ticker data changes
  useEffect(() => {
    if (!ticker) return;
    const parseNum = (value?: string): number | null => {
      if (value === undefined || value === null || value === "") return null;
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : null;
    };

    // Check if ticker data has actual values (not just "0" strings or empty)
    const hasLastPrice =
      ticker.lastPrice && ticker.lastPrice !== "0" && ticker.lastPrice !== "";
    const hasMarkPrice =
      ticker.markPrice && ticker.markPrice !== "0" && ticker.markPrice !== "";
    const hasIndexPrice =
      ticker.indexPrice &&
      ticker.indexPrice !== "0" &&
      ticker.indexPrice !== "";
    const hasFundingRate =
      ticker.fundingRate &&
      ticker.fundingRate !== "0" &&
      ticker.fundingRate !== "";

    setLastKnownValues((prev) => {
      const lastParsed = parseNum(ticker.lastPrice);
      const markParsed = parseNum(ticker.markPrice);
      const indexParsed = parseNum(ticker.indexPrice);
      const fundingParsed = parseNum(ticker.fundingRate);

      return {
        // Update if we have valid new data, otherwise preserve previous value
        currentPrice:
          hasLastPrice && lastParsed && lastParsed > 0
            ? lastParsed
            : prev.currentPrice,
        markPrice:
          hasMarkPrice && markParsed && markParsed > 0
            ? markParsed
            : prev.markPrice,
        indexPrice:
          hasIndexPrice && indexParsed && indexParsed > 0
            ? indexParsed
            : prev.indexPrice,
        change24hAmount:
          parseNum(
            (ticker as unknown as Record<string, unknown>).change24h as string
          ) ?? prev.change24hAmount,
        change24hPercent:
          parseNum(ticker.price24hPcnt) ?? prev.change24hPercent,
        fundingRate:
          hasFundingRate && fundingParsed !== null
            ? fundingParsed
            : prev.fundingRate,
        nextFundingTimeMs: ticker.nextFundingTime
          ? parseInt(ticker.nextFundingTime)
          : prev.nextFundingTimeMs,
      };
    });
  }, [ticker]);

  // Live Order Book Data mapping with fallbacks (from merged state)
  const orderBookData = useMemo(() => {
    // Prefer sticky-positive cached values to avoid flicker
    const currentPrice =
      lastKnownValues.currentPrice > 0
        ? lastKnownValues.currentPrice
        : ticker?.lastPrice && parseFloat(ticker.lastPrice) > 0
        ? parseFloat(ticker.lastPrice)
        : 0;

    // For mark, try: cached positive mark -> live positive mark -> cached positive index -> live positive index
    const liveMark = ticker?.markPrice ? parseFloat(ticker.markPrice) : 0;
    const liveIndex = ticker?.indexPrice ? parseFloat(ticker.indexPrice) : 0;
    const markPrice =
      lastKnownValues.markPrice > 0
        ? lastKnownValues.markPrice
        : liveMark > 0
        ? liveMark
        : lastKnownValues.indexPrice > 0
        ? lastKnownValues.indexPrice
        : liveIndex > 0
        ? liveIndex
        : 0;

    // Calculate Bid-Ask Ratio for top 20 levels (like Bybit)
    const top20Bids = mergedBook.bids.slice(0, 20);
    const top20Asks = mergedBook.asks.slice(0, 20);

    const totalBidVolume = top20Bids.reduce(
      (sum, bid) => sum + (Number(bid.total) || 0),
      0
    );
    const totalAskVolume = top20Asks.reduce(
      (sum, ask) => sum + (Number(ask.total) || 0),
      0
    );

    // Calculate Bid-Ask Ratio
    const bidAskRatio =
      totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 1;

    // Convert to percentage for display
    const totalVolume = totalBidVolume + totalAskVolume;
    const buyPercentage =
      totalVolume > 0 ? Math.round((totalBidVolume / totalVolume) * 100) : 50;
    const sellPercentage = 100 - buyPercentage;

    // Constant clip paths for angled edges
    const buyClipPath = "polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%)";
    const sellClipPath = "polygon(6px 0, 100% 0, 100% 100%, 0 100%)";

    // Debug logging for Bid-Ask Ratio calculation
    // console.log("📊 Bid-Ask Ratio Analysis (Top 20):", {
    //   totalBidVolume: totalBidVolume.toFixed(3),
    //   totalAskVolume: totalAskVolume.toFixed(3),
    //   bidAskRatio: bidAskRatio.toFixed(3),
    //   buyPercentage,
    //   sellPercentage,
    //   bidsCount: top20Bids.length,
    //   asksCount: top20Asks.length,
    // });

    // const recent = trades?.slice(0, 100) ?? [];
    // determine display limits based on mode
    const ASK_LIMIT =
      displayMode === "composite" ? 9 : displayMode === "left-red" ? 20 : 0;
    const BID_LIMIT =
      displayMode === "composite" ? 9 : displayMode === "left-green" ? 20 : 0;

    const asksTop = mergedBook.asks.slice(0, ASK_LIMIT);
    const bidsTop = mergedBook.bids.slice(0, BID_LIMIT);
    const maxAskTotal = asksTop.length
      ? Math.max(...asksTop.map((x) => Number(x.total) || 0))
      : 1;
    const maxBidTotal = bidsTop.length
      ? Math.max(...bidsTop.map((x) => Number(x.total) || 0))
      : 1;
    return {
      asks: asksTop,
      bids: bidsTop,
      maxAskTotal,
      maxBidTotal,
      currentPrice,
      markPrice,
      buyPercentage,
      sellPercentage,
      bidAskRatio,
      totalBidVolume,
      totalAskVolume,
      buyClipPath,
      sellClipPath,
    };
  }, [mergedBook, ticker, trades, displayMode, lastKnownValues]);

  // Demo Recent Trades Data
  // Live Recent Trades - using Bybit-compatible structure
  const recentTrades = useMemo(() => {
    const src = trades ?? [];
    // console.log("🔄 Processing trades data:", {
    //   tradesCount: src.length,
    //   sampleTrade: src[0],
    //   allTrades: src.slice(0, 3),
    // });

    return src.slice(0, 50).map((t) => {
      // Use the correct field names from Bybit API
      const price = parseFloat(
        (t.price as string) || (t.execPrice as string) || "0"
      );
      const qty = parseFloat((t.qty as string) || (t.execQty as string) || "0");

      // Handle time conversion
      let timeStr = "";
      if (t.time) {
        const timeValue = t.time as string;
        // Check if it's a timestamp (number) or ISO string
        if (/^\d+$/.test(timeValue)) {
          timeStr = new Date(parseInt(timeValue)).toLocaleTimeString([], {
            hour12: false,
          });
        } else {
          timeStr = new Date(timeValue).toLocaleTimeString([], {
            hour12: false,
          });
        }
      } else if (t.execTime) {
        timeStr = new Date(t.execTime as string).toLocaleTimeString([], {
          hour12: false,
        });
      } else {
        timeStr = new Date().toLocaleTimeString([], { hour12: false });
      }

      // Determine trade type based on side
      let tradeType = "buy";
      const side = (t.side as string) || "";
      if (side.toLowerCase() === "sell") {
        tradeType = "sell";
      } else if (side.toLowerCase() === "buy") {
        tradeType = "buy";
      } else {
        // Fallback to tickDirection if available
        const tickDirection = (t.tickDirection as string) || "";
        if (tickDirection.toLowerCase().includes("plus")) {
          tradeType = "buy";
        } else if (tickDirection.toLowerCase().includes("minus")) {
          tradeType = "sell";
        }
      }

      const trade = {
        price,
        qty,
        time: timeStr,
        type: tradeType,
        execId: (t.execId as string) || (t.tradeId as string) || "",
        tickDirection: (t.tickDirection as string) || "",
      };

      // console.log("📊 Mapped trade:", trade);
      return trade;
    });
  }, [trades]);

  // const precisionOptions = ["0.01", "0.1", "1"];

  // Check if order book data is loading - only show loading if we haven't received initial snapshot
  const isLoading =
    !hasReceivedSnapshotRef.current &&
    (!ob || (mergedBook.asks.length === 0 && mergedBook.bids.length === 0));

  if (isLoading) {
    return (
      <div className="border border-border bg-background rounded-none h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={80}>
      <div className="border border-border bg-background rounded-none text-sm h-full flex flex-col scrollbar-none">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-4">
            {/* Custom Tabs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("orderbook")}
                onMouseDown={handleMouseDown}
                className={`tab-button px-0 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "orderbook"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("tabs.orderBook")}
              </button>
              <button
                onClick={() => setActiveTab("trades")}
                onMouseDown={handleMouseDown}
                className={`tab-button px-0 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "trades"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("tabs.recentTrades")}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* More Options */}
            <MoreHorizontalIcon
              className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground"
              onMouseDown={handleMouseDown}
            />
          </div>
        </div>

        {/* Display Options Icons and Precision - Only for Order Book */}
        {activeTab === "orderbook" && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
            {/* Display Options Icons */}
            <div className="flex items-center gap-1">
              {/* 1) Composite: left red/green stacked, right rectangles stacked */}
              <div
                className={`display-option w-7 h-7 rounded flex items-center justify-center cursor-pointer hover:bg-muted/80 border ${
                  displayMode === "composite"
                    ? "border-ring"
                    : "border-border bg-muted"
                }`}
                onMouseDown={handleMouseDown}
                onClick={() => setDisplayMode("composite")}
                title={t("display.compositeTitle")}
                role="button"
                aria-pressed={displayMode === "composite"}
              >
                <div className="flex w-4 h-4">
                  {/* Left: red over green */}
                  <div className="flex flex-col gap-px w-1/2">
                    <div className="bg-loss w-full h-1/2 rounded-[1px]"></div>
                    <div className="bg-profit w-full h-1/2 rounded-[1px]"></div>
                  </div>
                  {/* Right: two rectangles */}
                  <div className="flex flex-col gap-px w-1/2 pl-px">
                    <div className="bg-muted-foreground/50 w-full h-1/2 rounded-[1px]"></div>
                    <div className="bg-muted-foreground/50 w-full h-1/2 rounded-[1px]"></div>
                  </div>
                </div>
              </div>

              {/* 2) Left full red; right rectangles stacked */}
              <div
                className={`display-option w-7 h-7 rounded flex items-center justify-center cursor-pointer hover:bg-muted/80 border ${
                  displayMode === "left-red"
                    ? "border-ring"
                    : "border-border bg-muted"
                }`}
                onMouseDown={handleMouseDown}
                onClick={() => setDisplayMode("left-red")}
                title={t("display.asksOnlyTitle")}
                role="button"
                aria-pressed={displayMode === "left-red"}
              >
                <div className="flex w-4 h-4">
                  <div className="bg-loss w-1/2 h-full rounded-[1px]"></div>
                  <div className="flex flex-col gap-px w-1/2 pl-px">
                    <div className="bg-muted-foreground/60 h-1/2 w-full rounded-[1px]"></div>
                    <div className="bg-muted-foreground/60 h-1/2 w-full rounded-[1px]"></div>
                  </div>
                </div>
              </div>

              {/* 3) Left full green; right rectangles stacked */}
              <div
                className={`display-option w-7 h-7 rounded flex items-center justify-center cursor-pointer hover:bg-muted/80 border ${
                  displayMode === "left-green"
                    ? "border-ring"
                    : "border-border bg-muted"
                }`}
                onMouseDown={handleMouseDown}
                onClick={() => setDisplayMode("left-green")}
                title={t("display.bidsOnlyTitle")}
                role="button"
                aria-pressed={displayMode === "left-green"}
              >
                <div className="flex w-4 h-4">
                  <div className="bg-profit w-1/2 h-full rounded-[1px]"></div>
                  <div className="flex flex-col gap-px w-1/2 pl-px">
                    <div className="bg-muted-foreground/60 h-1/2 w-full rounded-[1px]"></div>
                    <div className="bg-muted-foreground/60 h-1/2 w-full rounded-[1px]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Precision Dropdown */}
            {/* <div className="relative">
              <Select value={precision} onValueChange={setPrecision}>
                <SelectTrigger
                  className="w-[90px] h-8 text-xs font-medium rounded-none border-border"
                  onMouseDown={handleMouseDown}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-border">
                  {precisionOptions.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      className="py-1 text-xs rounded-none"
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "orderbook" ? (
            <div className="h-full flex flex-col">
              {/* Current Price Display - shown on top for single-mode displays */}
              {(displayMode === "left-red" || displayMode === "left-green") && (
                <div className="flex items-center px-3 py-2 border-b border-border bg-muted/10">
                  <div className="w-full text-center">
                    <span
                      className={`text-sm font-semibold ${
                        displayMode === "left-red"
                          ? "text-order-text-sell"
                          : "text-order-text-buy"
                      }`}
                    >
                      {formatNumber(orderBookData.currentPrice)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {t("labels.current")}
                    </span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-sm font-medium text-foreground">
                      {orderBookData.markPrice > 0
                        ? formatNumber(orderBookData.markPrice)
                        : "--.--"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {t("labels.mark")}
                    </span>
                  </div>
                </div>
              )}

              {/* Order Book Content */}
              <div className="flex-1 overflow-y-auto scrollbar-none">
                {/* Column Headers */}
                <div className="flex items-center text-xs text-muted-foreground border-b border-border h-9">
                  <div className="basis-[30%] text-center">
                    {t("headers.price")}
                  </div>
                  <div className="basis-[30%] text-center">
                    {t("headers.qtyBase", { base: baseAsset })}
                  </div>
                  <div className="basis-[40%] text-center flex items-center justify-end gap-2">
                    <Select
                      value={totalUnit}
                      onValueChange={(v) => setTotalUnit(v as string)}
                    >
                      <SelectTrigger className="text-xs text-muted-foreground rounded-none border-none px-6 h-0!">
                        <SelectValue
                          placeholder={t("headers.totalBase", {
                            base: baseAsset,
                          })}
                        >
                          {totalUnit === baseAsset
                            ? t("headers.totalBase", { base: baseAsset })
                            : t("headers.totalUsdt")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="text-xs! rounded-none min-w-[130px]">
                        <SelectItem
                          value={baseAsset}
                          className="text-xs rounded-none"
                        >
                          {t("headers.totalBase", { base: baseAsset })}
                        </SelectItem>
                        <SelectItem
                          value="USDT"
                          className="text-xs rounded-none"
                        >
                          {t("headers.totalUsdt")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Conditional Rendering Based on Display Mode */}
                {displayMode === "composite" && (
                  <>
                    {/* Sell Orders (Asks) */}
                    <div className="space-y-0">
                      {orderBookData.asks.map((ask, index) => (
                        <div
                          key={index}
                          className="flex items-center px-3 py-1 text-xs hover:bg-muted/20"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="basis-[30%] text-center text-order-text-sell transition-all duration-300 ease-out cursor-pointer select-none"
                                onMouseDown={handleMouseDown}
                                onClick={() =>
                                  emitSetLimitPrice(Number(ask.price))
                                }
                                title={t("tooltip.setLimitPrice")}
                              >
                                {formatNumber(ask.price)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              className="z-50 px-3 py-2 text-[11px]"
                              side="left"
                            >
                              <div className="flex items-center justify-between gap-6">
                                <span className="">
                                  {t("tooltip.avgPrice")}
                                </span>
                                <span className="tabular-nums font-mono">
                                  {formatNumber(
                                    (Number(ask.totalValue) || 0) /
                                      (Number(ask.total) || 1)
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span className="">
                                  {t("tooltip.totalQtyBase", {
                                    base: baseAsset,
                                  })}
                                </span>
                                <span className="tabular-nums font-mono">
                                  {(Number(ask.total) || 0).toFixed(3)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span className="">
                                  {t("tooltip.totalQtyUsdt")}
                                </span>
                                <span className="tabular-nums font-mono">
                                  {formatWithK(Number(ask.totalValue) || 0, 3)}
                                </span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <div className="basis-[30%] text-center text-foreground transition-all duration-300 ease-out">
                            {(Number(ask.size) || 0).toFixed(3)}
                          </div>
                          <div className="basis-[40%] text-center text-foreground relative">
                            <span className="relative z-10 transition-all duration-300 ease-out">
                              {formatTotalDisplay(ask)}
                            </span>
                            <div
                              className="absolute right-0 top-0 h-full bg-order-book-sell transition-all duration-500 ease-out"
                              style={{
                                width:
                                  ask.width ||
                                  `${
                                    ((Number(ask.total) || 0) /
                                      orderBookData.maxAskTotal) *
                                    100
                                  }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Current Price - slightly larger for emphasis */}
                    <div className="flex items-center px-3 py-2 border-y border-border bg-muted/10">
                      <div className="basis-[30%] text-center flex items-center gap-1">
                        <span className="text-order-text-sell">↓</span>
                        <span className="text-order-text-sell font-semibold text-sm">
                          {formatNumber(orderBookData.currentPrice)}
                        </span>
                      </div>
                      <div className="basis-[30%] text-center text-xs">
                        <span className="text-muted-foreground">🚩</span>
                      </div>
                      <div className="basis-[40%] text-center">
                        <span className="text-foreground text-sm font-medium">
                          {orderBookData.markPrice > 0
                            ? formatNumber(orderBookData.markPrice)
                            : "--.--"}
                        </span>
                      </div>
                    </div>

                    {/* Buy Orders (Bids) */}
                    <div className="space-y-0">
                      {orderBookData.bids.map((bid, index) => (
                        <div
                          key={index}
                          className="flex items-center px-3 py-1 text-xs hover:bg-muted/20"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="basis-[30%] text-center text-order-text-buy transition-all duration-300 ease-out cursor-pointer select-none"
                                onMouseDown={handleMouseDown}
                                onClick={() =>
                                  emitSetLimitPrice(Number(bid.price))
                                }
                                title={t("tooltip.setLimitPrice")}
                              >
                                {formatNumber(bid.price)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              className="z-50 px-3 py-2 text-[11px]"
                              side="left"
                            >
                              <div className="flex items-center justify-between gap-6">
                                <span className="">
                                  {t("tooltip.avgPrice")}
                                </span>
                                <span className="tabular-nums font-mono">
                                  {formatNumber(
                                    (Number(bid.totalValue) || 0) /
                                      (Number(bid.total) || 1)
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span className="">
                                  {t("tooltip.totalQtyBase", {
                                    base: baseAsset,
                                  })}
                                </span>
                                <span className="tabular-nums font-mono">
                                  {(Number(bid.total) || 0).toFixed(3)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span className="">
                                  {t("tooltip.totalQtyUsdt")}
                                </span>
                                <span className="tabular-nums font-mono">
                                  {formatWithK(Number(bid.totalValue) || 0, 3)}
                                </span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <div className="basis-[30%] text-center text-foreground transition-all duration-300 ease-out">
                            {(Number(bid.size) || 0).toFixed(3)}
                          </div>
                          <div className="basis-[40%] text-center text-foreground relative">
                            <span className="relative z-10 transition-all duration-300 ease-out">
                              {formatTotalDisplay(bid)}
                            </span>
                            <div
                              className="absolute right-0 top-0 h-full bg-order-book-buy transition-all duration-500 ease-out"
                              style={{
                                width:
                                  bid.width ||
                                  `${
                                    ((Number(bid.total) || 0) /
                                      orderBookData.maxBidTotal) *
                                    100
                                  }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Asks Only Mode (left-red) */}
                {displayMode === "left-red" && (
                  <div className="space-y-0">
                    {orderBookData.asks.map((ask, index) => (
                      <div
                        key={index}
                        className="flex items-center px-3 py-1 text-xs hover:bg-muted/20"
                      >
                        <div className="basis-[30%] text-center text-order-text-sell transition-all duration-300 ease-out">
                          {formatNumber(Number(ask.price))}
                        </div>
                        <div className="basis-[30%] text-center text-foreground transition-all duration-300 ease-out">
                          {(Number(ask.size) || 0).toFixed(3)}
                        </div>
                        <div className="basis-[40%] text-center text-foreground relative">
                          <span className="relative z-10 transition-all duration-300 ease-out">
                            {formatTotalDisplay(ask)}
                          </span>
                          <div
                            className="absolute right-0 top-0 h-full bg-order-book-sell transition-all duration-500 ease-out"
                            style={{
                              width:
                                ask.width ||
                                `${
                                  ((Number(ask.total) || 0) /
                                    orderBookData.maxAskTotal) *
                                  100
                                }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bids Only Mode (left-green) */}
                {displayMode === "left-green" && (
                  <div className="space-y-0">
                    {orderBookData.bids.map((bid, index) => (
                      <div
                        key={index}
                        className="flex items-center px-3 py-1 text-xs hover:bg-muted/20"
                      >
                        <div className="basis-[30%] text-center text-order-text-buy transition-all duration-300 ease-out">
                          {formatNumber(Number(bid.price))}
                        </div>
                        <div className="basis-[30%] text-center text-foreground transition-all duration-300 ease-out">
                          {(Number(bid.size) || 0).toFixed(3)}
                        </div>
                        <div className="basis-[40%] text-center text-foreground relative">
                          <span className="relative z-10 transition-all duration-300 ease-out">
                            {formatTotalDisplay(bid)}
                          </span>
                          <div
                            className="absolute right-0 top-0 h-full bg-order-book-buy transition-all duration-500 ease-out"
                            style={{
                              width:
                                bid.width ||
                                `${
                                  ((Number(bid.total) || 0) /
                                    orderBookData.maxBidTotal) *
                                  100
                                }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Percentage Bar - clean design with custom colors */}
              <div className="border-t border-border">
                <div className="relative h-6 m-2 flex gap-0">
                  <span className="flex items-center gap-2 w-fit bg-order-book-buy">
                    <div className="w-5 h-5 border border-order-text-buy bg-order-book-buy flex items-center justify-center relative shadow-sm">
                      <span className="text-order-text-buy text-xs font-semibold">
                        B
                      </span>
                    </div>

                    <span className="text-order-text-buy text-xs font-medium transition-all duration-300 ease-out">
                      {orderBookData.buyPercentage}%
                    </span>
                  </span>
                  {/* Main bar */}
                  <div className="relative w-full h-full overflow-hidden bg-muted/20 rounded-none">
                    {/* Center divider line */}
                    <div className="absolute left-1/2 top-0 w-px h-full bg-border/30 transform -translate-x-1/2 z-10"></div>
                    {/* Buy segment */}

                    <div
                      className="absolute left-0 top-0 h-full bg-linear-to-r from-order-book-buy to-order-book-buy/80 flex items-center transition-all duration-500 ease-out"
                      style={{
                        width: `${orderBookData.buyPercentage}%`,
                        clipPath: orderBookData.buyClipPath,
                      }}
                    ></div>

                    {/* Sell segment */}
                    <div
                      className="absolute right-0 top-0 h-full bg-linear-to-l from-order-book-sell to-order-book-sell/80 flex items-center justify-end transition-all duration-500 ease-out"
                      style={{
                        width: `${orderBookData.sellPercentage}%`,
                        clipPath: orderBookData.sellClipPath,
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center gap-2 w-fit bg-order-book-sell">
                    <span className="text-order-text-sell text-xs font-medium transition-all duration-300 ease-out">
                      {orderBookData.sellPercentage}%
                    </span>
                    <div className="w-5 h-5 border border-order-text-sell bg-order-book-sell flex items-center justify-center relative shadow-sm">
                      <span className="text-order-text-sell text-xs font-semibold">
                        S
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Recent Trades */
            <div className="h-full flex flex-col">
              {/* Column Headers */}
              <div className="flex items-center px-3 py-2 text-xs text-muted-foreground border-b border-border">
                <div className="w-1/3 text-center">{t("trades.priceUsdt")}</div>
                <div className="w-1/3 text-center">
                  {t("trades.qtyBase", { base: baseAsset })}
                </div>
                <div className="w-1/3 text-center">{t("trades.time")}</div>
              </div>

              {/* Trades List */}
              <div className="flex-1 overflow-y-auto">
                {recentTrades.map((trade, index) => (
                  <div
                    key={index}
                    className="flex items-center px-3 py-1 text-xs hover:bg-muted/20"
                  >
                    <div className="w-1/3 text-center flex items-center gap-1">
                      <span
                        className={`transition-all duration-300 ease-out ${
                          trade.type === "buy"
                            ? "text-order-text-buy"
                            : "text-order-text-sell"
                        }`}
                      >
                        {formatNumber(trade.price)}
                      </span>
                      {trade.type === "buy" && (
                        <span className="text-order-text-buy">↑</span>
                      )}
                    </div>
                    <div className="w-1/3 text-center text-foreground transition-all duration-300 ease-out">
                      {trade.qty?.toFixed(3) || "0.000"}
                    </div>
                    <div className="w-1/3 text-center text-muted-foreground transition-all duration-300 ease-out">
                      {trade.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
