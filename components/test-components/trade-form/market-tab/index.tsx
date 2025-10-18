import { useTickerData } from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { useCallback, useEffect, useState } from "react";
import { ExecutionTiming } from "../execution-timing";
import { LongShortButtons } from "../limit-tab/long-short-buttons";
import { PercentageButtons } from "../limit-tab/percentage-buttons";
import { TpSlSection } from "../limit-tab/tp-sl-section";
import { ValueCostSection } from "../limit-tab/value-cost-section";
import { QuantityMarketInput } from "./quantity-market-input";

interface MarketTabProps {
  roomId?: string;
  symbol?: Symbol;
  price: number;
  setPrice: (n: number) => void;
  availableBalance?: number;
  leverage?: number;
  executionTiming?: "now" | "time_based" | "price_based";
  scheduledDate?: Date;
  scheduledTime?: string;
  triggerCondition?: "above" | "below";
  triggerPrice?: string;
  currentPrice?: number;
}

export function MarketTab({
  roomId,
  symbol,
  price,
  setPrice,
  availableBalance = 0,
  leverage = 1,

  currentPrice,
}: MarketTabProps) {
  const [qty, setQty] = useState(0);
  const [placementMode, setPlacementMode] = useState<"qty" | "value">("qty");
  const [unitSymbol, setUnitSymbol] = useState<"BTC" | "USDT">("BTC");
  const [valueModeCapital, setValueModeCapital] = useState(0); // track USDT when in value mode

  // TP/SL state
  const [takeProfitValue, setTakeProfitValue] = useState(0);
  const [stopLossValue, setStopLossValue] = useState(0);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(true);

  // Handle TP/SL changes
  const handleTpSlChange = (data: {
    tpEnabled: boolean;
    slEnabled: boolean;
    takeProfitValue: number;
    stopLossValue: number;
  }) => {
    setTpEnabled(data.tpEnabled);
    setSlEnabled(data.slEnabled);
    setTakeProfitValue(data.takeProfitValue);
    setStopLossValue(data.stopLossValue);
  };

  // Execution timing state
  const [localExecutionTiming, setLocalExecutionTiming] = useState<
    "now" | "time_based" | "price_based"
  >("now");
  const [localScheduledDate, setLocalScheduledDate] = useState<
    Date | undefined
  >(undefined);
  const [localScheduledTime, setLocalScheduledTime] = useState<string>("");
  const [localTriggerCondition, setLocalTriggerCondition] = useState<
    "above" | "below"
  >("above");
  const [localTriggerPrice, setLocalTriggerPrice] = useState<string>("");
  const [localTimezone, setLocalTimezone] = useState<string>("Asia/Seoul");

  // Set initial price from live ticker for the symbol
  const ticker = useTickerData(symbol || "BTCUSDT");
  // Market tab: always track live price
  useEffect(() => {
    const lp = ticker?.lastPrice ? parseFloat(ticker.lastPrice) : 0;
    if (Number.isFinite(lp) && lp > 0) setPrice(lp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker?.lastPrice, symbol]);

  // const feeRate = 0.001; // 0.1% fee
  const FEE_RATE = 0.0005; // 0.05% fee
  const [tpSlChecked, setTpSlChecked] = useState(false);
  const [tpSlMode, setTpSlMode] = useState<"basic" | "advanced">("basic");

  const handleConfirmPrefs = () => {
    setUnitSymbol(placementMode === "value" ? "USDT" : "BTC");
  };

  // Mirror Limit tab: recompute qty when leverage/price changes using stored capital
  const valueModeRecompute = () => {
    let userCapital = 0;
    if (typeof window !== "undefined") {
      const capitalRef = (window as unknown as Record<string, unknown>)
        ._limit_user_capital_ref as { current?: number };
      userCapital = capitalRef?.current || 0;
    }

    if (userCapital >= 0 && price > 0) {
      const orderValue = userCapital * (leverage || 1);
      const nextQty = orderValue / price;
      if (Number.isFinite(nextQty)) {
        setQty(nextQty);
        setValueModeCapital(userCapital);
      }
    }
  };

  useEffect(() => {
    valueModeRecompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leverage, price, placementMode]);

  const openMarketPosition = useCallback(
    async (params: {
      side: "LONG" | "SHORT";
      price: number;
      qty: number;
      orderType: "market" | "limit";
      symbol?: string;
      leverage?: number;
      orderValue: number;
      fee: number;
      totalCost: number;
    }) => {
      try {
        if (!roomId) return;

        // If execution timing is not "now", create a scheduled order
        if (localExecutionTiming !== "now") {
          const localToUtcIso = (d: Date, t: string) => {
            const [hh, mm] = (t || "00:00").split(":").map((v) => Number(v));
            const local = new Date(
              d.getFullYear(),
              d.getMonth(),
              d.getDate(),
              Number.isFinite(hh) ? hh : 0,
              Number.isFinite(mm) ? mm : 0,
              0,
              0
            );
            return local.toISOString();
          };
          const scheduledOrderData = {
            symbol: params.symbol || (symbol as string) || "BTCUSDT",
            side: params.side === "LONG" ? "buy" : "sell",
            order_type: "market",
            quantity: params.qty,
            leverage: params.leverage || 1,
            schedule_type: localExecutionTiming,
            scheduled_at:
              localExecutionTiming === "time_based" &&
              localScheduledDate &&
              localScheduledTime
                ? localToUtcIso(localScheduledDate, localScheduledTime)
                : null,
            trigger_condition:
              localExecutionTiming === "price_based"
                ? localTriggerCondition
                : null,
            trigger_price:
              localExecutionTiming === "price_based"
                ? parseFloat(localTriggerPrice)
                : null,
            current_price: currentPrice || 0,
            // TP/SL parameters for scheduled orders
            tp_enabled: tpEnabled && takeProfitValue > 0,
            sl_enabled: slEnabled && stopLossValue > 0,
            take_profit_price:
              tpEnabled && takeProfitValue > 0 ? takeProfitValue : null,
            stop_loss_price:
              slEnabled && stopLossValue > 0 ? stopLossValue : null,
          };

          await fetch(`/api/trading-room/${roomId}/scheduled-orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scheduledOrderData),
          });

          return;
        }

        // Execute immediately for "now" timing
        await fetch(`/api/trading-room/${roomId}/positions/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: params.symbol || (symbol as string) || "BTCUSDT",
            side: params.side.toLowerCase(),
            quantity: params.qty,
            entryPrice: params.price,
            leverage: params.leverage || 1,
            orderType: "market",
            // TP/SL parameters
            tpEnabled: tpEnabled && takeProfitValue > 0,
            slEnabled: slEnabled && stopLossValue > 0,
            takeProfitPrice:
              tpEnabled && takeProfitValue > 0 ? takeProfitValue : null,
            stopLossPrice:
              slEnabled && stopLossValue > 0 ? stopLossValue : null,
          }),
        });
      } catch (e) {
        console.error(e);
      }
    },
    [
      symbol,
      roomId,
      localExecutionTiming,
      localScheduledDate,
      localScheduledTime,
      localTriggerCondition,
      localTriggerPrice,
      currentPrice,
      tpEnabled,
      slEnabled,
      takeProfitValue,
      stopLossValue,
    ]
  );

  return (
    <div className="space-y-3 pt-2">
      {/* <PriceInput price={price} setPrice={setPrice} disabled /> */}

      <QuantityMarketInput
        qty={qty}
        setQty={setQty}
        unitSymbol={unitSymbol}
        placementMode={placementMode}
        setPlacementMode={setPlacementMode}
        handleConfirmPrefs={handleConfirmPrefs}
        leverage={leverage}
        price={price}
        valueModeCapital={valueModeCapital}
        onValueModeCapitalChange={setValueModeCapital}
      />

      <PercentageButtons
        onPercentageSelect={(percentage) => {
          // percentage is 10, 25, 50, 75, 100 (whole numbers from buttons) or 0 (deactivated)
          if (!price || price <= 0) return;

          // If percentage is 0, clear the selection
          if (percentage === 0) {
            setQty(0);
            setValueModeCapital(0);
            // Clear stored capital
            if (typeof window !== "undefined") {
              window._limit_user_capital_ref = { current: 0 };
            }
            return;
          }

          // Calculate user's capital (their own money they want to spend)
          // Convert percentage from whole number (10) to decimal (0.1)
          const userCapital = availableBalance * (percentage / 100);

          // Calculate position size using leverage: Position Size = User Capital × Leverage
          const positionSize = userCapital * leverage;

          // Calculate quantity: Quantity = Position Size ÷ Price
          const computedQty = positionSize / price;

          if (Number.isFinite(computedQty)) {
            setQty(computedQty);
            setValueModeCapital(userCapital);
            // Don't force mode change - let user stay in their chosen mode

            // Remember the user's capital for future leverage changes
            if (typeof window !== "undefined") {
              window._limit_user_capital_ref = {
                current: userCapital,
              };
            }
          }
        }}
      />

      <ValueCostSection
        price={price}
        qty={qty}
        availableBalance={availableBalance}
        feeRate={FEE_RATE}
        orderType="market"
      />

      <TpSlSection
        tpSlChecked={tpSlChecked}
        setTpSlChecked={setTpSlChecked}
        tpSlMode={tpSlMode}
        setTpSlMode={setTpSlMode}
        orderType="market"
        onTpSlChange={handleTpSlChange}
      />

      <ExecutionTiming
        value={localExecutionTiming}
        onChange={setLocalExecutionTiming}
        scheduledDate={localScheduledDate}
        onScheduledDateChange={setLocalScheduledDate}
        scheduledTime={localScheduledTime}
        onScheduledTimeChange={setLocalScheduledTime}
        triggerCondition={localTriggerCondition}
        onTriggerConditionChange={setLocalTriggerCondition}
        triggerPrice={localTriggerPrice}
        onTriggerPriceChange={setLocalTriggerPrice}
        currentPrice={currentPrice || 0}
        timezone={localTimezone}
        onTimezoneChange={setLocalTimezone}
        orderContext="market"
      />

      <LongShortButtons
        price={price}
        qty={qty}
        orderType="market"
        symbol={symbol}
        leverage={1}
        feeRate={FEE_RATE}
        onConfirm={openMarketPosition}
      />
    </div>
  );
}
