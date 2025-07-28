"use client";

import { useState } from "react";
import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
}

interface TickerData {
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
}

interface TradeData {
  id: number | string;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

interface OrderBookComponentData {
  orderBook?: OrderBookData;
  ticker?: TickerData;
  trades?: TradeData[];
  orderBookError?: string;
}

interface OrderBookProps {
  symbol?: string;
  data?: OrderBookComponentData;
}

export function OrderBook({ symbol = "BTCUSDT", data }: OrderBookProps) {
  const [activeTab, setActiveTab] = useState("orderBook");
  const [priceDecimals, setPriceDecimals] = useState(2);

  // const baseAsset = symbol.replace(/USDT$/i, "").replace(/.{4}$/, "");

  // Get symbol config for label and isNew
  const symbolConfig = TRADING_SYMBOLS.find((s) => s.value === symbol);
  const baseAssetLabel =
    symbolConfig?.label?.split("/")[0] || symbol.replace(/USDT$/i, "");
  // const isNewSymbol = !!symbolConfig?.isNew;

  const orderBookData = data?.orderBook;
  const orderBookError = data?.orderBookError;
  const tradesData = data?.trades;

  // Helper to calculate running total for a side
  function getRowsWithTotal(rows: Array<[string, string]>) {
    let total = 0;
    return rows.map(([price, amount]) => {
      total += parseFloat(amount);
      return {
        price: parseFloat(price).toFixed(priceDecimals),
        amount: parseFloat(amount).toFixed(4),
        total: total.toFixed(4),
      };
    });
  }

  const bids = orderBookData?.bids?.slice(0, 6) || [];
  const asks = orderBookData?.asks?.slice(0, 6) || [];
  const buyRows = getRowsWithTotal(bids);
  const sellRows = getRowsWithTotal(asks);

  // Calculate buy/sell ratio for indicator
  const buyVolume = bids.reduce(
    (sum: number, [_, amount]: [string, string]) => sum + parseFloat(amount),
    0
  );
  const sellVolume = asks.reduce(
    (sum: number, [_, amount]: [string, string]) => sum + parseFloat(amount),
    0
  );
  const totalVolume = buyVolume + sellVolume;
  const buyPercent = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 0;
  const sellPercent = totalVolume > 0 ? (sellVolume / totalVolume) * 100 : 0;

  function formatTime(ts: number) {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour12: false });
  }

  return (
    <div className="flex flex-col h-full bg-background text-xs select-none">
      <div className="flex border-b border-border justify-between items-center px-2">
        <div className="flex">
          <button
            className={`px-4 py-2 ${
              activeTab === "orderBook"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("orderBook")}
          >
            Book
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === "recentTrades"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("recentTrades")}
          >
            Trades
          </button>
        </div>

        {activeTab === "orderBook" && (
          <div className="relative">
            <select
              className="appearance-none bg-secondary border border-border text-foreground py-1 px-2 rounded pr-8"
              value={priceDecimals}
              onChange={(e) => setPriceDecimals(Number(e.target.value))}
            >
              <option value={2}>0.01</option>
              <option value={1}>0.1</option>
              <option value={0}>1</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {activeTab === "orderBook" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="grid grid-cols-3 text-muted-foreground p-2 text-sm border-b border-border">
            <span>Price (USDT)</span>
            <span className="text-right">Amt. ({baseAssetLabel})</span>
            <span className="text-right">Total</span>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
            {/* Show error or empty message if no order book data */}
            {orderBookError ? (
              <div className="flex-1 flex items-center justify-center text-red-500 text-sm p-4">
                Failed to load order book: {orderBookError}
              </div>
            ) : buyRows.length === 0 && sellRows.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
                No order book data available for this symbol.
              </div>
            ) : (
              <>
                {/* Render sell (asks) - red, above center bar */}
                {sellRows.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 p-2 hover:bg-muted-foreground/10"
                  >
                    <span className="text-red-500">{item.price}</span>
                    <span className="text-right">{item.amount}</span>
                    <span className="text-right">{item.total}</span>
                  </div>
                ))}
                {/* Center bar (dynamic ticker) */}
                <div className="flex items-center justify-between p-2 my-1 bg-muted rounded">
                  {data?.ticker ? (
                    <>
                      <span
                        className={
                          parseFloat(data.ticker.priceChange) >= 0
                            ? "text-green-500 font-bold text-base"
                            : "text-red-500 font-bold text-base"
                        }
                      >
                        {parseFloat(data.ticker.lastPrice).toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                          className={
                            parseFloat(data.ticker.priceChange) >= 0
                              ? "w-3 h-3 text-green-500"
                              : "w-3 h-3 text-red-500"
                          }
                          style={{
                            transform:
                              parseFloat(data.ticker.priceChange) >= 0
                                ? undefined
                                : "rotate(180deg)",
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5"
                          />
                        </svg>
                        <span
                          className={
                            parseFloat(data.ticker.priceChange) >= 0
                              ? "text-green-500 font-bold"
                              : "text-red-500 font-bold"
                          }
                        >
                          {parseFloat(data.ticker.priceChange).toFixed(2)}
                        </span>
                        <span
                          className={
                            parseFloat(data.ticker.priceChange) >= 0
                              ? "text-green-500 font-bold"
                              : "text-red-500 font-bold"
                          }
                        >
                          (
                          {parseFloat(data.ticker.priceChangePercent).toFixed(
                            2
                          )}
                          %)
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                {/* Render buy (bids) - green, below center bar */}
                {buyRows.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 p-2 hover:bg-muted-foreground/10"
                  >
                    <span className="text-green-500">{item.price}</span>
                    <span className="text-right">{item.amount}</span>
                    <span className="text-right">{item.total}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Buy/Sell Ratio Indicator - Fixed at bottom */}
          <div className="sticky bottom-0 left-0 right-0">
            <div className="flex w-full h-3">
              <div
                className="bg-green-500"
                style={{ width: `${buyPercent}%` }}
              ></div>
              <div
                className="bg-red-500"
                style={{ width: `${sellPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-muted-foreground text-[13px] mt-2">
              <div className="flex items-center gap-1">
                <span className="text-green-100 flex items-center justify-center aspect-square bg-green-500/50 w-5 h-5">
                  B
                </span>
                <span>{buyPercent.toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{sellPercent.toFixed(2)}%</span>
                <span className="text-red-100 flex items-center justify-center aspect-square bg-red-500/50 w-5 h-5">
                  S
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "recentTrades" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="grid grid-cols-3 text-muted-foreground p-2 text-sm border-b border-border">
            <span>Price (USDT)</span>
            <span className="text-right">Qty ({baseAssetLabel})</span>
            <span className="text-right">Time</span>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
            {tradesData?.map((item: TradeData, index: number) => (
              <div
                key={item.id || index}
                className="grid grid-cols-3 p-2 hover:bg-muted-foreground/10"
              >
                <span
                  className={
                    item.isBuyerMaker ? "text-red-500" : "text-green-500"
                  }
                >
                  {parseFloat(item.price).toFixed(2)}
                </span>
                <span className="text-right">
                  {parseFloat(item.qty).toFixed(6)}
                </span>
                <span className="text-right text-muted-foreground">
                  {formatTime(item.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
