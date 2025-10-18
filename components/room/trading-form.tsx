"use client";

import BuyLongButton from "@/components/room/buy-long-button";
import LeverageControl from "@/components/room/leverage-control";
import MarginModeControl from "@/components/room/margin-mode-control";
import OrderFormLimit from "@/components/room/order-form-limit";
import OrderFormMarket from "@/components/room/order-form-market";
import OrderTypeTabs from "@/components/room/order-type-tabs";
import PercentButtons from "@/components/room/percent-buttons";
import SellShortButton from "@/components/room/sell-short-button";
import TradingInfo from "@/components/room/trading-info";
import { usePositions } from "@/hooks/use-positions";
import { VIRTUAL_BALANCE_KEY } from "@/hooks/use-virtual-balance";
import { useOrderFormStore } from "@/lib/store/order-form-store";
import { createClient } from "@/lib/supabase/client";
import { clamp, getSymbolMeta, roundToStep } from "@/lib/trading-form-utils";
// import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { useTradingFormStore } from "@/lib/store/trading-form-store";

export function TradingForm({
  currentPrice,
  virtualBalance,
  roomId,
  hostId,
  symbol,
}: {
  currentPrice?: number;
  virtualBalance: number;
  roomId: string;
  hostId: string;
  symbol: string;
}) {
  // const t = useTranslations("room.tradingForm");
  const { orderType } = useOrderFormStore();
  const [marginMode, setMarginMode] = useState("cross"); // 'cross' or 'isolated'
  const [leverage, setLeverage] = useState(1);
  // const [showLeverageModal] = useState(false);
  const {
    orderQuantity,
    setOrderQuantity,
    orderPrice,
    setOrderPrice,
    orderAmount,
    setOrderAmount,
    orderSide,
    setOrderSide,
    tpOnEntryPercent,
    setTpOnEntryPercent,
    slOnEntryPercent,
    setSlOnEntryPercent,
    confirmSnapshot,
    setConfirmSnapshot,
  } = useTradingFormStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // const [pendingLeverage] = useState(leverage);
  const [advisorApplied] = useState(false);
  const positionSizeSnapshotRef = useRef<number | null>(null);
  const [
    shouldUpdateQuantityAfterLeverage,
    setShouldUpdateQuantityAfterLeverage,
  ] = useState(false);

  const { qtyStep, minQty, maxQty, priceTick } = getSymbolMeta(symbol);
  // const [riskPercent] = useState<number>(1.0); // default 1%
  // const [advisorSlPercent] = useState<number>(1.0); // default 1%

  // confirmSnapshot read/write via zustand

  // Constants
  const FEE_RATE = 0.0005; // Taker fee (0.05%)
  const MAINTENANCE_MARGIN_RATE = 0.005; // 0.5% (can adjust as needed)

  // Clamp virtualBalance to 0 or above for all calculations and display
  const safeVirtualBalance = Math.max(0, virtualBalance);
  const price =
    orderType === "market"
      ? Number(currentPrice) || 0
      : Number(orderPrice) || 0;
  const quantity = Number(orderQuantity) || 0;
  const positionSize = price * quantity;
  const fee = positionSize * FEE_RATE;
  const initialMargin = leverage > 0 ? positionSize / leverage : 0;
  const leverageValue = initialMargin > 0 ? positionSize / initialMargin : 0;
  // Liquidation price formulas (CTO-approved)
  const lev = leverage;
  const mmr = MAINTENANCE_MARGIN_RATE;
  const liqPriceLong = lev > 0 ? price * (1 - lev * (1 - mmr)) : 0;
  const liqPriceShort = lev > 0 ? price * (1 + lev * (1 - mmr)) : 0;

  // Fetch default virtual balance from app-settings
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { isLoading: isSettingsLoading } = useSWR("/api/app-settings", fetcher);

  // Initialize limit price once when switching to limit (do not track live price)
  useEffect(() => {
    if (orderType === "limit" && !orderPrice && currentPrice) {
      setOrderPrice(Number(currentPrice).toFixed(2));
    }
    // Intentionally only react to orderType transitions; keep values frozen after init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  // Reset quantity/amount when symbol changes; do not pull fresh price for limit automatically
  useEffect(() => {
    // Keep existing limit price frozen; only user can update via Current Price
    setOrderQuantity("");
    setOrderAmount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // const symbolQtyStep = 0.000001; // basic step, can be refined per symbol

  // ===== Positions context for exposure/warnings =====
  type SimplePosition = { symbol: string; size: number };
  const positionsCtx = usePositions(roomId) as unknown as {
    openPositions?: unknown;
  };
  const toSimplePositions = (input: unknown): SimplePosition[] => {
    if (Array.isArray(input)) {
      return input.map((p) => {
        const obj = p as Record<string, unknown>;
        const sym = typeof obj.symbol === "string" ? obj.symbol : "";
        const sizeVal = Number(obj.size);
        return { symbol: sym, size: Number.isFinite(sizeVal) ? sizeVal : 0 };
      });
    }
    return [];
  };
  const openPositions: SimplePosition[] = toSimplePositions(
    positionsCtx?.openPositions
  );
  const baseFromSymbol = (sym: string) => sym.replace(/(USDT|USD|USDC)$/i, "");
  const currentBase = baseFromSymbol(symbol || "");
  // const correlatedCount = openPositions.filter(
  //   (p) => baseFromSymbol(p.symbol || "") === currentBase
  // ).length;
  // const totalExposure = openPositions.reduce(
  //   (sum: number, p) => sum + Number(p.size || 0),
  //   0
  // );
  // const afterExposure = totalExposure + (positionSize || 0);
  // const exposurePct =
  //   safeVirtualBalance > 0 ? (totalExposure / safeVirtualBalance) * 100 : 0;
  // const afterExposurePct =
  //   safeVirtualBalance > 0 ? (afterExposure / safeVirtualBalance) * 100 : 0;

  // const conservative = (() => {
  //   // const saved = riskPercent;
  //   const savedSl = advisorSlPercent;
  //   const tmpRisk = 0.5;
  //   const tmpSl = savedSl || 1.0;
  //   const entry = Number(price);
  //   const stop =
  //     orderSide === "long"
  //       ? entry * (1 - tmpSl / 100)
  //       : entry * (1 + tmpSl / 100);
  //   const lossPerUnit = Math.abs(entry - stop);
  //   if (!entry || !lossPerUnit) return 0;
  //   const raw = (safeVirtualBalance * (tmpRisk / 100)) / lossPerUnit;
  //   const cap = (safeVirtualBalance * leverage) / entry;
  //   const qty = Math.min(raw, cap);
  //   const rounded = Math.floor(qty / qtyStep) * qtyStep;
  //   return rounded;
  // })();
  // const moderate = (() => {
  //   const entry = Number(price);
  //   const tmpSl = advisorSlPercent || 1.0;
  //   const stop =
  //     orderSide === "long"
  //       ? entry * (1 - tmpSl / 100)
  //       : entry * (1 + tmpSl / 100);
  //   const lossPerUnit = Math.abs(entry - stop);
  //   if (!entry || !lossPerUnit) return 0;
  //   const raw = (safeVirtualBalance * (1 / 100)) / lossPerUnit;
  //   const cap = (safeVirtualBalance * leverage) / entry;
  //   const qty = Math.min(raw, cap);
  //   const rounded = Math.floor(qty / qtyStep) * qtyStep;
  //   return rounded;
  // })();
  // const aggressive = (() => {
  //   const entry = Number(price);
  //   const tmpSl = advisorSlPercent || 1.0;
  //   const stop =
  //     orderSide === "long"
  //       ? entry * (1 - tmpSl / 100)
  //       : entry * (1 + tmpSl / 100);
  //   const lossPerUnit = Math.abs(entry - stop);
  //   if (!entry || !lossPerUnit) return 0;
  //   const raw = (safeVirtualBalance * (2 / 100)) / lossPerUnit;
  //   const cap = (safeVirtualBalance * leverage) / entry;
  //   const qty = Math.min(raw, cap);
  //   const rounded = Math.floor(qty / qtyStep) * qtyStep;
  //   return rounded;
  // })();
  // const maximumSafe = (() => {
  //   const entry = Number(price);
  //   const tmpSl = advisorSlPercent || 1.0;
  //   const stop =
  //     orderSide === "long"
  //       ? entry * (1 - tmpSl / 100)
  //       : entry * (1 + tmpSl / 100);
  //   const lossPerUnit = Math.abs(entry - stop);
  //   if (!entry || !lossPerUnit) return 0;
  //   const raw = (safeVirtualBalance * (3 / 100)) / lossPerUnit;
  //   const cap = (safeVirtualBalance * leverage) / entry;
  //   const qty = Math.min(raw, cap);
  //   const rounded = Math.floor(qty / qtyStep) * qtyStep;
  //   return rounded;
  // })();

  // Get current user id on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  // Determine if the current user is the host
  const isHost = currentUserId === hostId;

  // Confirm order handler
  const handleConfirmOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!currentUserId || currentUserId !== hostId) {
        setError("Only the room creator can trade in this room.");
        setLoading(false);
        return;
      }
      const supabase = createClient();
      // Use the same calculation as UI
      const marginRequired = Number(orderAmount);
      const quantityToTrade = Number(orderQuantity);
      const entry_price = price;
      const fee = marginRequired * FEE_RATE; // or your fee logic
      const mmr = MAINTENANCE_MARGIN_RATE;
      let liquidation_price = 0;
      if (orderSide === "long") {
        liquidation_price = entry_price * (1 - leverage * (1 - mmr));
      } else {
        liquidation_price = entry_price * (1 + leverage * (1 - mmr));
      }
      // Use the new RPC for atomic insert and balance update
      const { error: rpcError } = await supabase.rpc(
        "open_position_and_update_balance",
        {
          p_room_id: roomId,
          p_user_id: currentUserId,
          p_symbol: symbol,
          p_side: orderSide,
          p_quantity: quantityToTrade,
          p_entry_price: entry_price,
          p_leverage: leverage,
          p_fee: fee,
          p_initial_margin: marginRequired,
          p_liquidation_price: liquidation_price,
        }
      );
      if (rpcError) {
        setError(rpcError.message);
      } else {
        // If TP/SL on entry provided, update latest open position for this user/room/symbol
        const hasTpSlOnEntry =
          (!!tpOnEntryPercent && Number(tpOnEntryPercent) > 0) ||
          (!!slOnEntryPercent && Number(slOnEntryPercent) > 0);
        if (hasTpSlOnEntry) {
          const { data: latestPos } = await supabase
            .from("trading_room_positions")
            .select("id")
            .eq("room_id", roomId)
            .eq("user_id", currentUserId)
            .eq("symbol", symbol)
            .is("closed_at", null)
            .order("opened_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestPos?.id) {
            await supabase
              .from("trading_room_positions")
              .update({
                tp_percent: tpOnEntryPercent ? Number(tpOnEntryPercent) : null,
                sl_percent: slOnEntryPercent ? Number(slOnEntryPercent) : null,
                tp_sl_active: true,
              })
              .eq("id", latestPos.id);

            // Optimistically update local cache so TP/SL shows immediately
            const openKey = ["open-positions", roomId] as const;
            mutate(
              openKey,
              (prev: unknown) => {
                if (!Array.isArray(prev)) return prev;
                return prev.map((p) => {
                  const rec = p as Record<string, unknown>;
                  const id = (rec as { id?: string }).id;
                  if (id === latestPos.id) {
                    const updates: Record<string, unknown> = {
                      tp_percent: tpOnEntryPercent
                        ? Number(tpOnEntryPercent)
                        : null,
                      sl_percent: slOnEntryPercent
                        ? Number(slOnEntryPercent)
                        : null,
                      tp_sl_active:
                        (!!tpOnEntryPercent && Number(tpOnEntryPercent) > 0) ||
                        (!!slOnEntryPercent && Number(slOnEntryPercent) > 0),
                    };
                    return { ...rec, ...updates } as typeof p;
                  }
                  return p;
                });
              },
              false
            );
          }
        }

        // Clear form and TP/SL inputs
        setOrderQuantity("");
        setOrderAmount("");
        setTpOnEntryPercent("");
        setSlOnEntryPercent("");

        // Force SWR to re-fetch positions instantly
        mutate(["open-positions", roomId]);
        mutate(["closed-positions", roomId]);
        // Force SWR to re-fetch virtual balance instantly
        console.log(
          `Trading form: Invalidating balance cache for room ${roomId}`
        );
        mutate(VIRTUAL_BALANCE_KEY(roomId));
      }
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "message" in e &&
        typeof (e as { message?: unknown }).message === "string"
      ) {
        setError((e as { message: string }).message);
      } else {
        setError("An error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Update orderQuantity after leverage changes if flag is set
  useEffect(() => {
    if (shouldUpdateQuantityAfterLeverage) {
      // Freeze limit tab: do not auto-update quantities on leverage change
      if (orderType === "limit") {
        positionSizeSnapshotRef.current = null;
        setShouldUpdateQuantityAfterLeverage(false);
        return;
      }
      const price =
        orderType === "market"
          ? Number(currentPrice) || 0
          : Number(orderPrice) || 0;
      if (
        positionSizeSnapshotRef.current !== null &&
        price > 0 &&
        leverage > 0
      ) {
        // quantity = (orderAmount / price) * leverage
        const orderAmount = positionSizeSnapshotRef.current;
        const quantity = (orderAmount / price) * leverage;
        setOrderQuantity(quantity.toFixed(6));
        // Do NOT update orderAmount here
      }
      positionSizeSnapshotRef.current = null;
      setShouldUpdateQuantityAfterLeverage(false);
    }
  }, [
    leverage,
    shouldUpdateQuantityAfterLeverage,
    orderType,
    currentPrice,
    orderPrice,
  ]);

  // Recompute derived fields on leverage change to avoid zeros (non-destructive)
  useEffect(() => {
    if (advisorApplied) return; // don't override advisor's value
    // Freeze limit tab inputs: do not auto-recompute on leverage changes
    if (orderType === "limit") return;
    const price =
      orderType === "market"
        ? Number(currentPrice) || 0
        : Number(orderPrice) || 0;
    if (!price || !leverage) return;
    const amtNum = Number(orderAmount);
    const qtyNum = Number(orderQuantity);
    if (Number.isFinite(amtNum) && amtNum > 0) {
      // keep margin constant, update quantity for new leverage
      const q = (amtNum * leverage) / price;
      setOrderQuantity(q.toFixed(6));
      return;
    }
    if (Number.isFinite(qtyNum) && qtyNum > 0) {
      // keep quantity constant, update margin amount
      const a = (qtyNum * price) / leverage;
      setOrderAmount(a.toFixed(2));
    }
  }, [
    leverage,
    advisorApplied,
    orderAmount,
    orderQuantity,
    orderType,
    currentPrice,
    orderPrice,
  ]);

  // Add EPSILON for floating point comparison
  const EPSILON = 0.01;
  // If you do not have isUsingUsdtInput, default to using orderAmount as margin
  const marginRequired = Number(orderAmount) || 0;
  const actualAvailableBalance = safeVirtualBalance;
  const hasEnoughBalance = actualAvailableBalance - marginRequired >= -EPSILON;
  // Always log for debugging
  // console.log(
  //   "[DEBUG] actualAvailableBalance:",
  //   actualAvailableBalance,
  //   "marginRequired:",
  //   marginRequired,
  //   "orderAmount:",
  //   orderAmount,
  //   "hasEnoughBalance:",
  //   hasEnoughBalance
  // );

  return (
    <div className="flex flex-col h-full bg-background text-xs text-foreground p-2 overflow-y-auto scrollbar-none select-none">
      {/* Top Controls: Margin Mode and Leverage */}
      <div className="flex justify-between items-center">
        <MarginModeControl
          marginMode={marginMode as "cross" | "isolated"}
          setMarginMode={setMarginMode as (m: "cross" | "isolated") => void}
          isHost={isHost}
        />

        <div className="relative w-1/2 pl-1">
          <LeverageControl
            isHost={isHost}
            orderType={orderType}
            currentPrice={currentPrice}
            orderPrice={orderPrice}
            leverage={leverage}
            setLeverage={setLeverage}
            priceTick={priceTick}
            qtyStep={qtyStep}
            minQty={minQty}
            maxQty={maxQty}
            safeVirtualBalance={safeVirtualBalance}
            symbol={symbol}
            currentBase={currentBase}
            orderQuantity={orderQuantity}
            orderAmount={orderAmount}
            setOrderQuantity={setOrderQuantity}
            setOrderAmount={setOrderAmount}
            openPositions={openPositions}
            orderSide={orderSide}
            maintenanceMarginRate={MAINTENANCE_MARGIN_RATE}
          />
        </div>
      </div>

      {/* Order Type Tabs */}
      <OrderTypeTabs />

      {orderType === "limit" ? (
        <OrderFormLimit
          isHost={isHost}
          symbol={symbol}
          orderPrice={orderPrice}
          setOrderPrice={setOrderPrice}
          orderQuantity={orderQuantity}
          setOrderQuantity={setOrderQuantity}
          orderAmount={orderAmount}
          setOrderAmount={setOrderAmount}
          currentPrice={currentPrice}
          leverage={leverage}
          qtyStep={qtyStep}
          minQty={minQty}
          maxQty={maxQty}
          priceTick={priceTick}
          hasEnoughBalance={hasEnoughBalance}
          roundToStep={roundToStep}
          clamp={clamp}
        />
      ) : (
        <OrderFormMarket
          isHost={isHost}
          symbol={symbol}
          currentPrice={currentPrice}
          orderQuantity={orderQuantity}
          setOrderQuantity={setOrderQuantity}
          orderAmount={orderAmount}
          setOrderAmount={setOrderAmount}
          leverage={leverage}
          qtyStep={qtyStep}
          minQty={minQty}
          maxQty={maxQty}
          roundToStep={roundToStep}
          clamp={clamp}
        />
      )}

      <PercentButtons
        isHost={isHost}
        isSettingsLoading={isSettingsLoading}
        safeVirtualBalance={safeVirtualBalance}
        currentPrice={currentPrice}
        orderPrice={orderPrice}
        leverage={leverage}
        qtyStep={qtyStep}
        minQty={minQty}
        maxQty={maxQty}
        setOrderAmount={setOrderAmount}
        setOrderQuantity={setOrderQuantity}
        setOrderPrice={setOrderPrice}
      />

      <TradingInfo
        fee={fee}
        leverageValue={leverageValue}
        positionSize={positionSize}
        initialMargin={initialMargin}
        liqPriceLong={liqPriceLong}
        liqPriceShort={liqPriceShort}
      />

      {/* Action Buttons - Fixed at bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-background pt-2 mt-auto border-t border-border">
        <div className="flex gap-2">
          <BuyLongButton
            isHost={isHost}
            hasEnoughBalance={hasEnoughBalance}
            symbol={symbol}
            orderType={orderType}
            orderPrice={orderPrice}
            currentPrice={currentPrice}
            leverage={leverage}
            orderQuantity={orderQuantity}
            orderAmount={orderAmount}
            safeVirtualBalance={safeVirtualBalance}
            tpOnEntryPercent={tpOnEntryPercent}
            slOnEntryPercent={slOnEntryPercent}
            setTpOnEntryPercent={setTpOnEntryPercent}
            setSlOnEntryPercent={setSlOnEntryPercent}
            MAINTENANCE_MARGIN_RATE={MAINTENANCE_MARGIN_RATE}
            confirmSnapshot={confirmSnapshot}
            setConfirmSnapshot={setConfirmSnapshot}
            setOrderSide={setOrderSide}
            loading={loading}
            error={error}
            handleConfirmOrder={handleConfirmOrder}
          />
          <SellShortButton
            isHost={isHost}
            hasEnoughBalance={hasEnoughBalance}
            symbol={symbol}
            orderType={orderType}
            orderPrice={orderPrice}
            currentPrice={currentPrice}
            leverage={leverage}
            orderQuantity={orderQuantity}
            orderAmount={orderAmount}
            safeVirtualBalance={safeVirtualBalance}
            tpOnEntryPercent={tpOnEntryPercent}
            slOnEntryPercent={slOnEntryPercent}
            setTpOnEntryPercent={setTpOnEntryPercent}
            setSlOnEntryPercent={setSlOnEntryPercent}
            MAINTENANCE_MARGIN_RATE={MAINTENANCE_MARGIN_RATE}
            confirmSnapshot={confirmSnapshot}
            setConfirmSnapshot={setConfirmSnapshot}
            setOrderSide={setOrderSide}
            loading={loading}
            error={error}
            handleConfirmOrder={handleConfirmOrder}
          />
        </div>
      </div>
    </div>
  );
}
