"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { createClient } from "@/lib/supabase/client";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { VIRTUAL_BALANCE_KEY } from "@/hooks/use-virtual-balance";

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
  // Ensure orderType is typed as 'limit' | 'market' for correct comparison
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [marginMode, setMarginMode] = useState("cross"); // 'cross' or 'isolated'
  const [leverage, setLeverage] = useState(1); // Default leverage
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  // Set default value to empty string for orderQuantity and orderPrice, but treat as 0 in calculations
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderPrice, setOrderPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
  // Liquidation price formulas (Binance style)
  const lev = leverage;
  const mmr = MAINTENANCE_MARGIN_RATE;
  const liqPriceLong = lev > 0 ? price * (lev / (lev + 1 - mmr * lev)) : 0;
  const liqPriceShort = lev > 1 ? price * (lev / (lev - 1 + mmr * lev)) : 0;

  // Fetch default virtual balance from app-settings
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { isLoading: isSettingsLoading } = useSWR("/api/app-settings", fetcher);

  // When currentPrice becomes available, if orderType is 'limit' and orderPrice is blank, set to currentPrice
  useEffect(() => {
    if (orderType === "limit" && !orderPrice && currentPrice) {
      setOrderPrice(Number(currentPrice).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice]);

  // Handle % buttons
  const handlePercentClick = (percent: number) => {
    const availableBalance = safeVirtualBalance;
    const price =
      orderType === "market"
        ? Number(currentPrice) || 0
        : Number(orderPrice) || 0;
    if (!price || !leverage) return;
    const amount = ((availableBalance * percent) / 100).toFixed(2);
    setOrderAmount(amount);
    const quantity = (Number(amount) * leverage) / price;
    setOrderQuantity(quantity.toFixed(6));
    setOrderPrice(price.toFixed(2));
  };

  // When user changes quantity, update order amount
  const handleQuantityChange = (value: string) => {
    setOrderQuantity(value);
    const price =
      orderType === "market"
        ? Number(currentPrice) || 0
        : Number(orderPrice) || 0;
    if (!price || !leverage) {
      setOrderAmount("");
      return;
    }
    const amount = ((Number(value) * price) / leverage).toFixed(2);
    setOrderAmount(amount);
  };

  const [pendingMarginMode, setPendingMarginMode] = useState(marginMode);
  const [pendingLeverage, setPendingLeverage] = useState(leverage);

  // Ref to snapshot position size (amount) when opening leverage dialog
  const positionSizeSnapshotRef = useRef<number | null>(null);
  // Flag to trigger quantity update after leverage changes
  const [
    shouldUpdateQuantityAfterLeverage,
    setShouldUpdateQuantityAfterLeverage,
  ] = useState(false);

  // Add state for order amount (USDT)
  const [orderAmount, setOrderAmount] = useState("");

  // Add state for order confirmation dialog
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderSide, setOrderSide] = useState<"long" | "short">("long");

  // Add a function to open the dialog with the correct side
  const handleOpenOrderDialog = (side: "long" | "short") => {
    setOrderSide(side);
    setShowOrderDialog(true);
  };

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
        liquidation_price =
          entry_price * (leverage / (leverage + 1 - mmr * leverage));
      } else {
        liquidation_price =
          entry_price * (leverage / (leverage - 1 + mmr * leverage));
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
        setShowOrderDialog(false);
        setOrderQuantity("");
        setOrderAmount("");
        // Force SWR to re-fetch positions instantly
        mutate(["open-positions", roomId]);
        mutate(["closed-positions", roomId]);
        // Force SWR to re-fetch virtual balance instantly
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
        <div className="relative w-1/2 pr-1">
          <Button
            variant="secondary"
            onClick={() => {
              if (!isHost) return;
              setPendingMarginMode(marginMode);
              setShowMarginModal(true);
            }}
            className="flex items-center justify-between gap-1 py-1.5 px-3 w-full text-xs font-medium"
            disabled={!isHost}
          >
            {marginMode === "cross" ? "Cross" : "Isolated"}{" "}
            <span className="text-muted-foreground">▼</span>
          </Button>
          <Dialog open={showMarginModal} onOpenChange={setShowMarginModal}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Choose Margin Mode</DialogTitle>
                <DialogDescription>
                  Make changes to your margin mode here. Click confirm when
                  you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <RadioGroup
                  value={pendingMarginMode}
                  onValueChange={(value: "cross" | "isolated") =>
                    setPendingMarginMode(value)
                  }
                  className="flex flex-row space-x-4"
                >
                  <div
                    className={`flex-1 flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                      pendingMarginMode === "cross"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                    onClick={() => setPendingMarginMode("cross")}
                  >
                    <RadioGroupItem
                      value="cross"
                      id="cross"
                      className="sr-only"
                    />
                    <Label htmlFor="cross" className="cursor-pointer">
                      Cross
                    </Label>
                  </div>
                  <div
                    className={`flex-1 flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                      pendingMarginMode === "isolated"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                    onClick={() => setPendingMarginMode("isolated")}
                  >
                    <RadioGroupItem
                      value="isolated"
                      id="isolated"
                      className="sr-only"
                    />
                    <Label htmlFor="isolated" className="cursor-pointer">
                      Isolated
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                If the loss exceeds the total holding (60%), it will be
                liquidated.
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                When changed, all positions and unfilled orders for the current
                item will be affected.
              </p>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setShowMarginModal(false)}
                  disabled={!isHost}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setMarginMode(pendingMarginMode);
                    setShowMarginModal(false);
                  }}
                  disabled={!isHost}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative w-1/2 pl-1">
          <Button
            variant="secondary"
            onClick={() => {
              if (!isHost) return;
              setPendingLeverage(leverage);
              setShowLeverageModal(true);
              // Snapshot order amount (margin) at dialog open
              const price =
                orderType === "market"
                  ? Number(currentPrice) || 0
                  : Number(orderPrice) || 0;
              const quantity = Number(orderQuantity) || 0;
              const orderAmount = (quantity * price) / leverage;
              positionSizeSnapshotRef.current = orderAmount;
            }}
            className="flex items-center justify-between gap-1 py-1.5 px-3 w-full text-xs font-medium"
            disabled={!isHost}
          >
            {leverage}x <span className="text-muted-foreground">▼</span>
          </Button>
          <Dialog open={showLeverageModal} onOpenChange={setShowLeverageModal}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Adjust Leverage</DialogTitle>
                <DialogDescription>
                  Make changes to your leverage here. Click confirm when
                  you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() =>
                      setPendingLeverage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={pendingLeverage <= 1}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={pendingLeverage}
                    onChange={(e) => setPendingLeverage(Number(e.target.value))}
                    className="w-full text-center text-lg h-10"
                    min="1"
                    max="100"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() =>
                      setPendingLeverage((prev) => Math.min(100, prev + 1))
                    }
                    disabled={pendingLeverage >= 100}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="relative w-full">
                  <Slider
                    value={[pendingLeverage]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={(value: number[]) =>
                      setPendingLeverage(value[0])
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-muted-foreground text-xs mt-2 select-none">
                    {[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(
                      (option) => (
                        <span
                          key={option}
                          className="cursor-pointer px-1"
                          onClick={() => setPendingLeverage(option)}
                          style={{ userSelect: "none" }}
                        >
                          {option}x
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                It can be multiplied by up to x50 by default, and can be
                multiplied by x100 when using items.
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                Add or subtract the quantity ratio that can be ordered based on
                the amount held.
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                When changed, all positions and unfilled orders for the current
                item will be affected.
              </p>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setShowLeverageModal(false)}
                  disabled={!isHost}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setLeverage(pendingLeverage);
                    setShouldUpdateQuantityAfterLeverage(true);
                    setShowLeverageModal(false);
                  }}
                  disabled={!isHost}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="flex border-b border-border mb-3">
        <button
          className={`px-4 py-2 text-xs font-medium ${
            orderType === "limit"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
          onClick={() => setOrderType("limit")}
        >
          Limit
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium ${
            orderType === "market"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
          onClick={() => setOrderType("market")}
        >
          Market
        </button>
      </div>

      {/* Order Inputs */}
      <div className="flex flex-col gap-3 mb-3">
        <div>
          <label className="block text-muted-foreground mb-1 text-xs">
            Order Price (USDT)
          </label>
          <div className="flex items-center bg-secondary border border-border rounded-md px-3 py-1.5 relative">
            <Input
              type="number"
              value={
                orderType === "market"
                  ? currentPrice
                    ? Number(currentPrice).toFixed(2)
                    : "0"
                  : orderPrice
              }
              onChange={(e) => setOrderPrice(e.target.value)}
              readOnly={orderType === "market" || !isHost}
              className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 pr-16 no-spinner"
            />
            <span className="text-muted-foreground text-xs">USDT</span>
            {orderType === "limit" && currentPrice && (
              <button
                type="button"
                className="absolute right-12 top-1/2 -translate-y-1/2 text-primary text-xs font-semibold px-2 py-0.5 rounded hover:bg-primary/10 border border-primary/20"
                onClick={() => setOrderPrice(Number(currentPrice).toFixed(2))}
                tabIndex={-1}
                disabled={!isHost}
              >
                Current Price
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-muted-foreground mb-1 text-xs">
            Order Quantity (BTCUSDT)
          </label>
          <div className="flex items-center bg-secondary border border-border rounded-md px-3 py-1.5">
            <Input
              type="number"
              value={orderQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 no-spinner"
              readOnly={!isHost}
            />
            <span className="text-muted-foreground text-xs">BTCUSDT</span>
          </div>
        </div>

        {orderType === "limit" && (
          <div>
            <label className="block text-muted-foreground mb-1 text-xs">
              Order Amount (USDT)
            </label>
            <div
              className={`flex items-center bg-secondary border rounded-md px-3 py-1.5 ${
                !hasEnoughBalance ? "border-red-500" : "border-border"
              }`}
            >
              <Input
                type="number"
                value={Number(orderAmount).toFixed(4)}
                onChange={(e) => {
                  setOrderAmount(e.target.value);
                  const price =
                    orderType === "limit"
                      ? Number(orderPrice) || 0
                      : Number(currentPrice) || 0;
                  if (!price || !leverage) {
                    setOrderQuantity("");
                    return;
                  }
                  const quantity = (Number(e.target.value) * leverage) / price;
                  setOrderQuantity(quantity.toFixed(6));
                }}
                step="0.0001"
                readOnly={!isHost}
                className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 no-spinner"
              />
              <span className="text-muted-foreground text-xs">USDT</span>
            </div>
            {!hasEnoughBalance && (
              <div className="text-xs text-red-500 mt-1">
                Insufficient balance.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Percentage Buttons */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {isSettingsLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="w-full text-xs py-1 h-7 animate-pulse bg-muted"
                disabled
              >
                ...
              </Button>
            ))
          : [10, 25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                className="w-full text-xs py-1 h-7"
                onClick={() => handlePercentClick(percent)}
                disabled={!isHost}
              >
                {percent}%
              </Button>
            ))}
      </div>

      {/* Trading Info */}
      <div className="flex flex-col gap-1.5 mb-3 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Fee:</span>
          <span>{fee.toFixed(2)} USDT</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Leverage:</span>
          <span>{leverageValue.toFixed(2)}x</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Position Size (USDT):</span>
          <span>{positionSize.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Initial Margin (USDT):</span>
          <span>{initialMargin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Est. Liq. Price (Long):</span>
          <span className="text-red-500">
            {liqPriceLong > 0 ? liqPriceLong.toFixed(2) : "-"}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Est. Liq. Price (Short):</span>
          <span className="text-green-500">
            {liqPriceShort > 0 ? liqPriceShort.toFixed(2) : "-"}
          </span>
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-background pt-2 mt-auto border-t border-border">
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-xs font-medium"
            onClick={() => handleOpenOrderDialog("long")}
            disabled={!isHost || !hasEnoughBalance}
            title={
              !isHost
                ? "Only the room creator can trade in this room."
                : !hasEnoughBalance
                ? "Insufficient balance."
                : undefined
            }
          >
            Buy / Long
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white h-9 text-xs font-medium"
            onClick={() => handleOpenOrderDialog("short")}
            disabled={!isHost || !hasEnoughBalance}
            title={
              !isHost
                ? "Only the room creator can trade in this room."
                : !hasEnoughBalance
                ? "Insufficient balance."
                : undefined
            }
          >
            Sell / Short
          </Button>
        </div>
      </div>

      {/* Order Confirmation Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md rounded-xl border border-border bg-background p-0">
          <div className="px-6 pt-5 pb-2">
            <DialogTitle className="text-lg font-semibold mb-2">
              {orderSide === "long"
                ? "Confirm Buy / Long Order"
                : "Confirm Sell / Short Order"}
            </DialogTitle>
            <p className="text-muted-foreground text-sm mb-4">
              Please review your order before submitting.
            </p>
            <div className="rounded-md border border-border bg-muted/50 px-4 py-3 mb-2">
              <div className="grid gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[15px]">
                    Trading Pair
                  </span>
                  <span className="font-semibold text-[15px]">BTCUSDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[15px]">
                    Order Direction
                  </span>
                  <span
                    className={`font-semibold text-[15px] ${
                      orderSide === "long" ? "text-success" : "text-red-400"
                    }`}
                  >
                    {orderSide === "long" ? "Buy / Long" : "Sell / Short"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[15px]">
                    Order Type
                  </span>
                  <span className="font-semibold text-[15px]">
                    {orderType === "market" ? "Market" : "Limit"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[15px]">
                    Quantity
                  </span>
                  <span className="font-semibold text-[15px]">
                    {orderQuantity || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[15px]">
                    Price
                  </span>
                  <span className="font-semibold text-[15px]">
                    {orderType === "market"
                      ? (currentPrice || 0).toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })
                      : orderPrice}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[15px]">
                    Leverage
                  </span>
                  <span className="font-semibold text-[15px]">{leverage}x</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-border bg-muted/30 rounded-md px-4 py-2">
              <span className="text-base font-semibold text-muted-foreground">
                Total
              </span>
              <span
                className={`text-2xl font-bold tracking-tight ${
                  orderSide === "long" ? "text-success" : "text-red-400"
                }`}
              >
                $
                {Number(orderAmount).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                  minimumFractionDigits: 4,
                })}
              </span>
            </div>
          </div>
          <DialogFooter className="px-6 pb-5 pt-5">
            <Button
              variant="secondary"
              className="w-28 h-10"
              onClick={() => setShowOrderDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant={orderSide === "long" ? "success" : "destructive"}
              className="w-28 h-10"
              onClick={handleConfirmOrder}
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm"}
            </Button>
          </DialogFooter>
          {error && (
            <div className="text-xs text-red-500 mt-2 px-4 py-2 rounded-md bg-red-50">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
