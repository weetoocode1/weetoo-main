import { useTickerData } from "@/hooks/websocket/use-market-data";
import type { Symbol } from "@/types/market";
import { useEffect, useState } from "react";
import { LongShortButtons } from "./long-short-buttons";
import { PercentageButtons } from "./percentage-buttons";
import { PriceInput } from "./price-input";
import { QuantityInput } from "./quantity-input";
import { TpSlSection } from "./tp-sl-section";
import { ValueCostSection } from "./value-cost-section";
import { ExecutionTiming } from "../execution-timing";

// Extend Window interface for custom properties
declare global {
  interface Window {
    _limit_user_capital_ref?: { current: number };
  }
}

interface LimitTabProps {
  symbol?: Symbol;
  price: number;
  setPrice: (n: number) => void;
  currentPrice?: number;
  availableBalance?: number;
  leverage?: number;
  executionTiming?: "now" | "time_based" | "price_based";
  scheduledDate?: Date;
  scheduledTime?: string;
  triggerCondition?: "above" | "below";
  triggerPrice?: string;
}

export function LimitTab({
  symbol,
  price,
  setPrice,
  currentPrice,
  availableBalance = 0,
  leverage = 1,
}: LimitTabProps) {
  const [qty, setQty] = useState(0);
  const [placementMode, setPlacementMode] = useState<"qty" | "value">("qty");
  const [unitSymbol, setUnitSymbol] = useState<"BTC" | "USDT">("BTC");
  const [valueModeCapital, setValueModeCapital] = useState(0); // track USDT when in value mode

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
  // Limit tab: do not auto-update price from ticker; only set when user clicks Last
  const setToLast = () => {
    const lp =
      (currentPrice && Number.isFinite(currentPrice) && currentPrice > 0
        ? currentPrice
        : ticker?.lastPrice
        ? parseFloat(ticker.lastPrice)
        : 0) || 0;
    if (Number.isFinite(lp) && lp > 0) setPrice(lp);
  };

  // On first render (or when symbol changes), if price is zero, seed it from currentPrice
  useEffect(() => {
    if (!price || price <= 0) {
      const lp =
        (currentPrice && Number.isFinite(currentPrice) && currentPrice > 0
          ? currentPrice
          : ticker?.lastPrice
          ? parseFloat(ticker.lastPrice)
          : 0) || 0;
      if (Number.isFinite(lp) && lp > 0) setPrice(lp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // availableBalance provided from parent (room.virtual_balance)
  const FEE_RATE = 0.0005;
  // const MAINTENANCE_MARGIN_RATE = 0.005;
  const [tpSlChecked, setTpSlChecked] = useState(false);
  const [tpSlMode, setTpSlMode] = useState<"basic" | "advanced">("basic");

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

  const handleConfirmPrefs = () => {
    const newUnitSymbol = placementMode === "value" ? "USDT" : "BTC";
    setUnitSymbol(newUnitSymbol);

    // When switching modes, recalculate based on current values
    if (placementMode === "value") {
      // Switching to value mode - user will enter USDT amount
      // Keep current quantity, but prepare for USDT input
    } else {
      // Switching to qty mode - user will enter BTC amount
      // Keep current quantity as is
    }
  };

  // Recompute qty when leverage/price changes
  const valueModeRecompute = () => {
    // Get the user's fixed capital amount
    const userCapital =
      (typeof window !== "undefined" &&
        window._limit_user_capital_ref?.current) ||
      0;

    // If we have user capital and price > 0, recalculate quantity based on leverage
    if (userCapital >= 0 && price > 0) {
      // In value mode, input shows Order Value; qty is derived from it
      const orderValue = userCapital * leverage; // reflect leverage in display
      const nextQty = orderValue / price;

      if (Number.isFinite(nextQty)) {
        setQty(nextQty);
        setValueModeCapital(userCapital);
        // Don't force mode change - let user stay in their chosen mode
      }
    }
  };

  // Recompute when leverage or price changes while in value mode
  useEffect(() => {
    valueModeRecompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leverage, price, placementMode]);

  // Listen for order book price click events to set price (Limit tab only)
  useEffect(() => {
    const handleSetLimitPrice = (e: CustomEvent<{ price: number }>) => {
      const p = Number(e?.detail?.price);
      if (Number.isFinite(p) && p > 0) setPrice(p);
    };
    if (typeof window !== "undefined") {
      window.addEventListener(
        "set-limit-price",
        handleSetLimitPrice as EventListener
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "set-limit-price",
          handleSetLimitPrice as EventListener
        );
      }
    };
  }, [setPrice]);

  return (
    <div className="space-y-3 pt-2">
      {/* Price Input */}
      <div className="flex flex-col gap-2.5 justify-center border py-2.5 px-2 bg-muted/20 rounded-md">
        <PriceInput
          price={price}
          setPrice={setPrice}
          lastButton
          onLastClick={setToLast}
        />

        {/* Quantity Input */}
        <QuantityInput
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
      </div>
      {/* Percentage Buttons */}
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

      {/* Value and Cost Section */}
      <ValueCostSection
        price={price}
        qty={qty}
        availableBalance={availableBalance}
        feeRate={FEE_RATE}
        leverage={leverage}
      />

      {/* TP/SL Section */}
      <TpSlSection
        tpSlChecked={tpSlChecked}
        setTpSlChecked={setTpSlChecked}
        tpSlMode={tpSlMode}
        setTpSlMode={setTpSlMode}
        orderType="limit"
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
        orderContext="limit"
        limitPrice={price}
      />

      {/* Long/Short Buttons */}
      <LongShortButtons
        price={price}
        qty={qty}
        orderType="limit"
        symbol={symbol}
        leverage={leverage}
        feeRate={FEE_RATE}
        onConfirm={async (params) => {
          try {
            const roomId = (window as unknown as Record<string, unknown>)
              ?.CURRENT_TRADING_ROOM_ID;
            if (!roomId) return;

            // If execution timing is not "now", create a scheduled order
            if (localExecutionTiming !== "now") {
              const localToUtcIso = (d: Date, t: string) => {
                const [hh, mm] = (t || "00:00")
                  .split(":")
                  .map((v) => Number(v));
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
                symbol: params.symbol,
                side: params.side === "LONG" ? "buy" : "sell",
                order_type: "limit",
                quantity: params.qty,
                price: params.price,
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
            await fetch(`/api/trading-room/${roomId}/open-orders`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                symbol: params.symbol,
                side: params.side === "LONG" ? "long" : "short",
                limitPrice: params.price,
                quantity: params.qty,
                leverage: params.leverage || 1,
                timeInForce: "GTC",
                // Include TP/SL data
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
        }}
      />
    </div>
  );
}
