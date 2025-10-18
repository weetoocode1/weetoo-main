"use client";

import { useTickerData } from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { useEffect, useState } from "react";
import { CrossSelect } from "./trade-form/cross-select";
import { LeverageDialog } from "./trade-form/leverage-dialog";
import { LeverageSelect } from "./trade-form/leverage-select";
import { LimitTab } from "./trade-form/limit-tab";
import { MarketTab } from "./trade-form/market-tab";

interface TradeFormProps {
  roomId?: string;
  symbol?: Symbol;
  availableBalance?: number;
}

export function TradeForm({
  roomId,
  symbol,
  availableBalance = 0,
}: TradeFormProps) {
  const [marginMode, setMarginMode] = useState("cross");
  const [leverage, setLeverage] = useState("1x");
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [dialogLeverage, setDialogLeverage] = useState(1);
  const [orderType, setOrderType] = useState("limit");
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [marketPrice, setMarketPrice] = useState<number>(0);

  const ticker = useTickerData(symbol || "BTCUSDT");
  const currentPrice = ticker?.lastPrice ? parseFloat(ticker.lastPrice) : 0;

  useEffect(() => {
    try {
      const key = `entryPrice_${symbol}`;
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const n = Number(stored);
        if (Number.isFinite(n) && n > 0) {
          setLimitPrice(n);
          return;
        }
      }
    } catch {}

    const lp = ticker?.lastPrice ? parseFloat(ticker.lastPrice) : 0;
    if (Number.isFinite(lp) && lp > 0) setLimitPrice(lp);
  }, [symbol]);

  useEffect(() => {
    const lp = ticker?.lastPrice ? parseFloat(ticker.lastPrice) : 0;
    if (Number.isFinite(lp) && lp > 0) setMarketPrice(lp);
  }, [ticker?.lastPrice]);

  return (
    <div className="border border-border bg-background rounded-none text-sm w-full h-full flex flex-col">
      <div className="flex items-center justify-between w-full border-b p-2 border-border">
        <span className="font-medium">Trade</span>
      </div>

      <div className="p-2">
        <div className="flex gap-1 items-center">
          <CrossSelect
            value={marginMode}
            onChange={setMarginMode}
            key={marginMode}
          />
          <LeverageSelect
            value={leverage}
            onChange={setLeverage}
            options={["1x", "3x", "5x", "10x", "25x", "50x", "100x"]}
            onOpenCustomize={() => {
              setIsCustomizeOpen(true);
            }}
          />
          <LeverageDialog
            open={isCustomizeOpen}
            onClose={() => {
              setIsCustomizeOpen(false);
            }}
            value={dialogLeverage}
            onChange={(v) => {
              setDialogLeverage(v);
            }}
            availableBalance={availableBalance}
            currentPrice={marketPrice}
          />
        </div>

        <div className="flex border-b border-border mt-2">
          <button
            onClick={() => setOrderType("limit")}
            className={`px-3 py-2 text-sm cursor-pointer ${
              orderType === "limit"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => setOrderType("market")}
            className={`px-3 py-2 text-sm cursor-pointer ${
              orderType === "market"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Market
          </button>
        </div>

        <div className="mt-2">
          {orderType === "limit" ? (
            <LimitTab
              symbol={symbol}
              price={limitPrice}
              setPrice={setLimitPrice}
              currentPrice={marketPrice}
              availableBalance={availableBalance}
              leverage={Number(String(leverage).replace(/x/i, "")) || 1}
            />
          ) : (
            <MarketTab
              roomId={roomId}
              symbol={symbol}
              price={marketPrice}
              setPrice={setMarketPrice}
              availableBalance={availableBalance}
              leverage={Number(String(leverage).replace(/x/i, "")) || 1}
              currentPrice={currentPrice}
            />
          )}
        </div>
      </div>
    </div>
  );
}
