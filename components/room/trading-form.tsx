"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { usePositions } from "@/hooks/use-positions";
import { VIRTUAL_BALANCE_KEY } from "@/hooks/use-virtual-balance";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, MinusIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";

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
  const t = useTranslations("room.tradingForm");
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
  // Liquidation price formulas (CTO-approved)
  const lev = leverage;
  const mmr = MAINTENANCE_MARGIN_RATE;
  const liqPriceLong = lev > 0 ? price * (1 - lev * (1 - mmr)) : 0;
  const liqPriceShort = lev > 0 ? price * (1 + lev * (1 - mmr)) : 0;

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

  // Reset order price when symbol changes
  useEffect(() => {
    if (orderType === "limit" && currentPrice) {
      setOrderPrice(Number(currentPrice).toFixed(2));
    }
    // Clear quantity and amount when symbol changes since they are symbol-specific
    setOrderQuantity("");
    setOrderAmount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, currentPrice]);

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

  // Quantity change: allow free typing; only compute amount when a valid number
  const handleQuantityChange = (value: string) => {
    setOrderQuantity(value);
    const price =
      orderType === "market"
        ? Number(currentPrice) || 0
        : Number(orderPrice) || 0;
    const num = Number(value);
    if (!price || !leverage || !Number.isFinite(num)) {
      setOrderAmount("");
      return;
    }
    setOrderAmount(((num * price) / leverage).toFixed(2));
  };

  // Quantity blur: normalize to step and clamp
  const handleQuantityBlur = () => {
    const num = Number(orderQuantity);
    if (!Number.isFinite(num)) {
      setOrderQuantity("");
      return;
    }
    const rounded = roundToStep(num, qtyStep);
    const clamped = clamp(rounded, minQty, maxQty);
    setOrderQuantity(clamped ? clamped.toFixed(6) : "");
    const price =
      orderType === "market"
        ? Number(currentPrice) || 0
        : Number(orderPrice) || 0;
    if (price && leverage) {
      setOrderAmount(((clamped * price) / leverage).toFixed(2));
    }
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
  // Track if advisor explicitly set quantity to avoid auto-recalc after leverage confirm
  const [advisorApplied, setAdvisorApplied] = useState(false);

  // Add state for order side
  const [orderSide, setOrderSide] = useState<"long" | "short">("long");

  // Margin level indicator (for confirm dialogs)
  const computeMarginLevel = () => {
    const entry = Number(price);
    const liq = orderSide === "long" ? liqPriceLong : liqPriceShort;
    if (!Number.isFinite(entry) || !Number.isFinite(liq) || entry === liq) {
      return null;
    }
    let ratio = 0;
    if (orderSide === "long") {
      const denom = entry - liq;
      if (denom <= 0) return null;
      ratio = (entry - liq) / denom;
    } else {
      const denom = liq - entry;
      if (denom <= 0) return null;
      ratio = (liq - entry) / denom;
    }
    ratio = Math.max(0, Math.min(1, ratio));
    const percent = (ratio * 100).toFixed(0);
    if (ratio >= 0.7) return { key: "safe" as const, percent };
    if (ratio >= 0.3) return { key: "caution" as const, percent };
    return { key: "atRisk" as const, percent };
  };

  // TP/SL on entry (optional)
  const [tpOnEntryPercent, setTpOnEntryPercent] = useState("");
  const [slOnEntryPercent, setSlOnEntryPercent] = useState("");

  // ===== TP/SL on entry safeguards =====
  // const MIN_LIQ_DISTANCE_PCT = 0.5; // minimum safe distance from liquidation in % of (entry-liq)
  // const slTooCloseToLiq = (() => {
  //   const entry = Number(price);
  //   const liq = orderSide === "long" ? liqPriceLong : liqPriceShort;
  //   const slPct = Number(slOnEntryPercent);
  //   if (
  //     !slPct ||
  //     !Number.isFinite(entry) ||
  //     !Number.isFinite(liq) ||
  //     entry === liq
  //   )
  //     return false;
  //   if (orderSide === "long") {
  //     const slPrice = entry * (1 - slPct / 100);
  //     const denom = entry - liq;
  //     if (denom <= 0) return false;
  //     const distancePct = ((slPrice - liq) / denom) * 100;
  //     return distancePct < MIN_LIQ_DISTANCE_PCT;
  //   } else {
  //     const slPrice = entry * (1 + slPct / 100);
  //     const denom = liq - entry;
  //     if (denom <= 0) return false;
  //     const distancePct = ((liq - slPrice) / denom) * 100;
  //     return distancePct < MIN_LIQ_DISTANCE_PCT;
  //   }
  // })();

  // Helper function to format numbers
  const format2 = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  };

  // ===== Symbol precision (qty step / price tick) =====
  type SymbolMeta = {
    qtyStep: number;
    minQty: number;
    maxQty: number;
    priceTick: number;
  };
  const getSymbolMeta = (sym: string): SymbolMeta => {
    const s = (sym || "").toUpperCase();
    // Basic defaults; refine per market as needed
    if (s.includes("BTC"))
      return {
        qtyStep: 0.001,
        minQty: 0.001,
        maxQty: 1_000_000,
        priceTick: 0.01,
      };
    if (s.includes("ETH"))
      return {
        qtyStep: 0.01,
        minQty: 0.01,
        maxQty: 1_000_000,
        priceTick: 0.01,
      };
    return {
      qtyStep: 0.001,
      minQty: 0.001,
      maxQty: 1_000_000,
      priceTick: 0.01,
    };
  };
  const { qtyStep, minQty, maxQty, priceTick } = getSymbolMeta(symbol);
  const roundToStep = (value: number, step: number) =>
    step > 0 ? Math.round(value / step) * step : value;
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  // ===== Position Size Advisor =====
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // default 1%
  const [advisorSlPercent, setAdvisorSlPercent] = useState<number>(1.0); // default 1%
  const symbolQtyStep = 0.000001; // basic step, can be refined per symbol

  const advisor = (() => {
    const entry = Number(price);
    const riskPct = Number(riskPercent);
    const slPct = Number(advisorSlPercent || slOnEntryPercent || 0);
    const balance = safeVirtualBalance;
    const effectiveLeverage = showLeverageModal ? pendingLeverage : leverage;
    if (!entry || !riskPct || !balance || !effectiveLeverage) {
      return null;
    }
    const stopPrice =
      orderSide === "long"
        ? roundToStep(entry * (1 - (slPct || 0) / 100), priceTick)
        : roundToStep(entry * (1 + (slPct || 0) / 100), priceTick);
    if (!Number.isFinite(stopPrice) || stopPrice <= 0 || stopPrice === entry)
      return null;
    const lossPerUnit = Math.abs(entry - stopPrice);
    if (lossPerUnit <= 0) return null;
    const riskBudget = balance * (riskPct / 100);
    const rawQty = riskBudget / lossPerUnit;
    const capacityQty = (balance * effectiveLeverage) / entry; // max notional / entry
    const suggestedQty = Math.max(0, Math.min(rawQty, capacityQty));
    const roundedQty = Math.floor(suggestedQty / symbolQtyStep) * symbolQtyStep;
    const requiredMargin = (entry * roundedQty) / effectiveLeverage;
    const estLoss = lossPerUnit * roundedQty;
    const roeAtStop = (-estLoss / requiredMargin) * 100 || 0;
    const capped = suggestedQty < rawQty - 1e-9; // margin capped
    return {
      stopPrice,
      roundedQty,
      requiredMargin,
      estLoss,
      roeAtStop,
      capped,
    };
  })();

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
  const correlatedCount = openPositions.filter(
    (p) => baseFromSymbol(p.symbol || "") === currentBase
  ).length;
  const totalExposure = openPositions.reduce(
    (sum: number, p) => sum + Number(p.size || 0),
    0
  );
  const afterExposure = totalExposure + (positionSize || 0);
  const exposurePct =
    safeVirtualBalance > 0 ? (totalExposure / safeVirtualBalance) * 100 : 0;
  const afterExposurePct =
    safeVirtualBalance > 0 ? (afterExposure / safeVirtualBalance) * 100 : 0;

  const conservative = (() => {
    // const saved = riskPercent;
    const savedSl = advisorSlPercent;
    const tmpRisk = 0.5;
    const tmpSl = savedSl || 1.0;
    const entry = Number(price);
    const stop =
      orderSide === "long"
        ? entry * (1 - tmpSl / 100)
        : entry * (1 + tmpSl / 100);
    const lossPerUnit = Math.abs(entry - stop);
    if (!entry || !lossPerUnit) return 0;
    const raw = (safeVirtualBalance * (tmpRisk / 100)) / lossPerUnit;
    const cap = (safeVirtualBalance * leverage) / entry;
    const qty = Math.min(raw, cap);
    const rounded = Math.floor(qty / qtyStep) * qtyStep;
    return rounded;
  })();
  const moderate = (() => {
    const entry = Number(price);
    const tmpSl = advisorSlPercent || 1.0;
    const stop =
      orderSide === "long"
        ? entry * (1 - tmpSl / 100)
        : entry * (1 + tmpSl / 100);
    const lossPerUnit = Math.abs(entry - stop);
    if (!entry || !lossPerUnit) return 0;
    const raw = (safeVirtualBalance * (1 / 100)) / lossPerUnit;
    const cap = (safeVirtualBalance * leverage) / entry;
    const qty = Math.min(raw, cap);
    const rounded = Math.floor(qty / qtyStep) * qtyStep;
    return rounded;
  })();
  const aggressive = (() => {
    const entry = Number(price);
    const tmpSl = advisorSlPercent || 1.0;
    const stop =
      orderSide === "long"
        ? entry * (1 - tmpSl / 100)
        : entry * (1 + tmpSl / 100);
    const lossPerUnit = Math.abs(entry - stop);
    if (!entry || !lossPerUnit) return 0;
    const raw = (safeVirtualBalance * (2 / 100)) / lossPerUnit;
    const cap = (safeVirtualBalance * leverage) / entry;
    const qty = Math.min(raw, cap);
    const rounded = Math.floor(qty / qtyStep) * qtyStep;
    return rounded;
  })();
  const maximumSafe = (() => {
    const entry = Number(price);
    const tmpSl = advisorSlPercent || 1.0;
    const stop =
      orderSide === "long"
        ? entry * (1 - tmpSl / 100)
        : entry * (1 + tmpSl / 100);
    const lossPerUnit = Math.abs(entry - stop);
    if (!entry || !lossPerUnit) return 0;
    const raw = (safeVirtualBalance * (3 / 100)) / lossPerUnit;
    const cap = (safeVirtualBalance * leverage) / entry;
    const qty = Math.min(raw, cap);
    const rounded = Math.floor(qty / qtyStep) * qtyStep;
    return rounded;
  })();

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
            {marginMode === "cross" ? t("margin.cross") : t("margin.isolated")}{" "}
            <span className="text-muted-foreground">▼</span>
          </Button>
          <Dialog open={showMarginModal} onOpenChange={setShowMarginModal}>
            <DialogContent className="!sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("margin.chooseTitle")}</DialogTitle>
                <DialogDescription>{t("margin.chooseDesc")}</DialogDescription>
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
                      {t("margin.cross")}
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
                      {t("margin.isolated")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                {t("margin.notice1")}
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                {t("margin.notice2")}
              </p>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setShowMarginModal(false)}
                  disabled={!isHost}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    setMarginMode(pendingMarginMode);
                    setShowMarginModal(false);
                  }}
                  disabled={!isHost}
                >
                  {t("common.confirm")}
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
            <DialogContent className="!max-w-[700px] !sm:!max-w-[700px] !w-[700px] max-h-[80vh] flex flex-col p-1">
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle>{t("leverage.title")}</DialogTitle>
                <DialogDescription>{t("leverage.desc")}</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto scrollbar-none px-6 pb-4">
                <div className="flex items-center gap-2 mb-3">
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
                {/* Position Size Advisor */}
                <div className="px-4 mt-4">
                  <div className="rounded-md border border-border bg-muted/50 px-4 py-4 mb-3">
                    <Accordion
                      type="single"
                      defaultValue="advisorInputs"
                      className="w-full space-y-2 "
                    >
                      {/* 1a) Advisor Inputs & Metrics */}
                      <AccordionItem
                        value="advisorInputs"
                        className="border border-border rounded-md px-2"
                      >
                        <AccordionTrigger className="text-sm">
                          {t("positionSize.title", {
                            default: "Position Size Advisor",
                          })}{" "}
                          —{" "}
                          {t("advisor.fields", { default: "Inputs & Metrics" })}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid md:grid-cols-2 gap-4 px-2 pb-2">
                            {/* Inputs (left) */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <Label className="text-xs text-muted-foreground">
                                  {t("positionSize.riskPercent", {
                                    default: "Risk (%) of balance",
                                  })}
                                </Label>
                                <div className="flex items-center gap-2 w-44">
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="0.1"
                                    max="5"
                                    value={riskPercent}
                                    onChange={(e) =>
                                      setRiskPercent(Number(e.target.value))
                                    }
                                    className="h-9 text-sm text-right"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <Label className="text-xs text-muted-foreground">
                                  {t("tpsl.stopLoss", {
                                    default: "Stop Loss (%)",
                                  })}
                                </Label>
                                <div className="flex items-center gap-2 w-44">
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="0"
                                    value={advisorSlPercent}
                                    onChange={(e) =>
                                      setAdvisorSlPercent(
                                        Number(e.target.value)
                                      )
                                    }
                                    className="h-9 text-sm text-right"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Metrics (right) */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {t("positionSize.stopPrice", {
                                    default: "Stop Price",
                                  })}
                                </div>
                                <div className="text-sm font-semibold">
                                  {advisor ? format2(advisor.stopPrice) : "-"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {t("positionSize.suggestedQty", {
                                    default: "Suggested Qty",
                                  })}
                                </div>
                                <div className="text-sm font-semibold">
                                  {advisor
                                    ? advisor.roundedQty.toFixed(6)
                                    : "-"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {t("positionSize.requiredMargin", {
                                    default: "Required Margin (USDT)",
                                  })}
                                </div>
                                <div className="text-sm font-semibold">
                                  {advisor
                                    ? format2(advisor.requiredMargin)
                                    : "-"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {t("positionSize.estLoss", {
                                    default: "Estimated Loss (USDT)",
                                  })}
                                </div>
                                <div className="text-sm font-semibold text-red-500">
                                  {advisor
                                    ? `-${format2(advisor.estLoss)}`
                                    : "-"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {t("positionSize.roeAtStop", {
                                    default: "ROE at SL",
                                  })}
                                </div>
                                <div className="text-sm font-semibold">
                                  {advisor
                                    ? `${advisor.roeAtStop.toFixed(2)}%`
                                    : "-"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* 1b) Risk Scenarios & Apply */}
                      <AccordionItem
                        value="advisorScenarios"
                        className="border border-border rounded-md px-2"
                      >
                        <AccordionTrigger className="text-sm">
                          {t("positionSize.title", {
                            default: "Position Size Advisor",
                          })}{" "}
                          — {t("advisor.results", { default: "Scenarios" })}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 px-2 pb-2">
                            <div className="grid gap-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t("positionSize.conservative", {
                                    default: "Conservative (0.5%)",
                                  })}
                                </span>
                                <span className="font-medium">
                                  {conservative ? conservative.toFixed(6) : "-"}{" "}
                                  {currentBase}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t("positionSize.moderate", {
                                    default: "Moderate (1%)",
                                  })}
                                </span>
                                <span className="font-medium">
                                  {moderate ? moderate.toFixed(6) : "-"}{" "}
                                  {currentBase}{" "}
                                  {riskPercent === 1 ? "\u2190" : ""}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t("positionSize.aggressive", {
                                    default: "Aggressive (2%)",
                                  })}
                                </span>
                                <span className="font-medium">
                                  {aggressive ? aggressive.toFixed(6) : "-"}{" "}
                                  {currentBase}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t("positionSize.maximumSafe", {
                                    default: "Maximum Safe (3%)",
                                  })}
                                </span>
                                <span className="font-medium">
                                  {maximumSafe ? maximumSafe.toFixed(6) : "-"}{" "}
                                  {currentBase}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                disabled={!advisor || advisor.roundedQty <= 0}
                                onClick={() => {
                                  if (!advisor) return;
                                  setOrderQuantity(
                                    advisor.roundedQty.toFixed(6)
                                  );
                                  const updatedAmount = (
                                    (advisor.roundedQty * price) /
                                    leverage
                                  ).toFixed(2);
                                  setOrderAmount(updatedAmount);
                                  setAdvisorApplied(true);
                                }}
                              >
                                {t("positionSize.apply", { default: "Apply" })}
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* 2) Account Balance Context */}
                      <AccordionItem
                        value="account"
                        className="border border-border rounded-md px-2"
                      >
                        <AccordionTrigger className="text-sm">
                          {t("positionSize.accountBalance", {
                            default: "Account Balance",
                          })}{" "}
                          /{" "}
                          {t("positionSize.availableBalance", {
                            default: "Available Balance",
                          })}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-3 text-xs px-2 pb-2">
                            <div className="text-muted-foreground">
                              {t("positionSize.accountBalance", {
                                default: "Account Balance",
                              })}
                            </div>
                            <div className="text-right font-medium">
                              ${format2(safeVirtualBalance)}
                            </div>
                            <div className="text-muted-foreground">
                              {t("positionSize.availableBalance", {
                                default: "Available Balance",
                              })}
                            </div>
                            <div className="text-right font-medium">
                              ${format2(safeVirtualBalance)}
                            </div>
                            <div className="text-muted-foreground">
                              {t("positionSize.openPositions", {
                                default: "Current Open Positions",
                              })}
                            </div>
                            <div className="text-right font-medium">
                              {openPositions.length}
                            </div>
                            <div className="text-muted-foreground">
                              {t("positionSize.totalExposure", {
                                default: "Total Exposure",
                              })}
                            </div>
                            <div className="text-right font-medium">
                              ${format2(totalExposure)} ({format2(exposurePct)}
                              %)
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* 3) Risk Validation & Warnings */}
                      <AccordionItem
                        value="warnings"
                        className="border border-border rounded-md px-2"
                      >
                        <AccordionTrigger className="text-sm">
                          {t("marginLevel.title", {
                            default: "Risk Validation & Warnings",
                          })}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 px-2 pb-2">
                            {afterExposurePct > 300 && (
                              <div className="flex items-center gap-2 text-amber-500 text-xs">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {t("positionSize.warnExposure", {
                                  percent: afterExposurePct.toFixed(0),
                                  default: `Total account exposure will be ${afterExposurePct.toFixed(
                                    0
                                  )}% after this position`,
                                })}
                              </div>
                            )}
                            {advisor &&
                              advisor.requiredMargin >
                                safeVirtualBalance * 0.45 && (
                                <div className="flex items-center gap-2 text-amber-500 text-xs">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {t("positionSize.warnBalanceUse", {
                                    percent: (
                                      (advisor.requiredMargin /
                                        safeVirtualBalance) *
                                      100
                                    ).toFixed(0),
                                    default: `This position uses ${(
                                      (advisor.requiredMargin /
                                        safeVirtualBalance) *
                                      100
                                    ).toFixed(0)}% of available balance`,
                                  })}
                                </div>
                              )}
                            {correlatedCount >= 3 && (
                              <div className="flex items-center gap-2 text-amber-500 text-xs">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {t("positionSize.warnCorrelated", {
                                  count: correlatedCount,
                                  base: currentBase,
                                  default: `${correlatedCount} correlated positions already open (${currentBase})`,
                                })}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* 4) Liquidation Analysis */}
                      <AccordionItem
                        value="liquidation"
                        className="border border-border rounded-md px-2"
                      >
                        <AccordionTrigger className="text-sm">
                          {t("positionSize.liqPrice", {
                            default: "Liquidation Analysis",
                          })}
                        </AccordionTrigger>
                        <AccordionContent>
                          {(() => {
                            const entry = Number(price);
                            if (!entry || !leverage) return null;
                            const MMR = MAINTENANCE_MARGIN_RATE;
                            const liqPrice =
                              orderSide === "long"
                                ? entry * (1 - leverage * (1 - MMR))
                                : entry * (1 + leverage * (1 - MMR));
                            const distancePct =
                              ((orderSide === "long"
                                ? entry - liqPrice
                                : liqPrice - entry) /
                                entry) *
                              100;
                            const stop = advisor
                              ? advisor.stopPrice
                              : orderSide === "long"
                              ? entry * (1 - (advisorSlPercent || 1) / 100)
                              : entry * (1 + (advisorSlPercent || 1) / 100);
                            const buffer = Math.max(
                              0,
                              Math.abs(stop - liqPrice)
                            );
                            const tooClose = distancePct < 1;
                            return (
                              <div className="grid grid-cols-2 gap-3 text-xs px-2 pb-2">
                                <div className="text-muted-foreground">
                                  {t("positionSize.liqPrice", {
                                    default: "Liquidation Price",
                                  })}
                                </div>
                                <div className="text-right font-medium">
                                  ${format2(liqPrice)}
                                </div>
                                <div className="text-muted-foreground">
                                  {t("positionSize.distanceToLiq", {
                                    default: "Distance to Liquidation",
                                  })}
                                </div>
                                <div
                                  className={
                                    "text-right font-medium " +
                                    (tooClose ? "text-amber-600" : "")
                                  }
                                >
                                  {distancePct.toFixed(2)}%{" "}
                                  {tooClose
                                    ? t("positionSize.tooClose", {
                                        default: "TOO CLOSE!",
                                      })
                                    : ""}
                                </div>
                                <div className="text-muted-foreground">
                                  {t("positionSize.bufferFromSl", {
                                    default: "Buffer from SL to Liq",
                                  })}
                                </div>
                                <div className="text-right font-medium">
                                  ${format2(buffer)}
                                </div>
                              </div>
                            );
                          })()}
                        </AccordionContent>
                      </AccordionItem>

                      {/* 5) Notices */}
                      <AccordionItem
                        value="notices"
                        className="border border-border rounded-md px-2"
                      >
                        <AccordionTrigger className="text-sm">
                          {t("leverage.title", { default: "Notices" })}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="text-muted-foreground text-sm space-y-2 px-2 pb-2">
                            <p className="mb-0">{t("leverage.notice1")}</p>
                            <p className="mb-0">{t("leverage.notice2")}</p>
                            <p className="mb-0">{t("leverage.notice3")}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t mt-0 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => setShowLeverageModal(false)}
                  disabled={!isHost}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    setLeverage(pendingLeverage);
                    // If advisor applied quantity, do not overwrite it on confirm
                    setShouldUpdateQuantityAfterLeverage(!advisorApplied);
                    setAdvisorApplied(false);
                    setShowLeverageModal(false);
                  }}
                  disabled={!isHost}
                >
                  {t("common.confirm")}
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
          {t("tabs.limit")}
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium ${
            orderType === "market"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
          onClick={() => setOrderType("market")}
        >
          {t("tabs.market")}
        </button>
      </div>

      {/* Order Inputs */}
      <div className="flex flex-col gap-3 mb-3">
        <div>
          <Label className="block text-muted-foreground mb-1 text-xs">
            {t("inputs.orderPrice", { quote: "USDT" })}
          </Label>
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
                {t("buttons.currentPrice")}
              </button>
            )}
          </div>
        </div>

        <div>
          <Label className="block text-muted-foreground mb-1 text-xs">
            {t("inputs.orderQuantity", { base: symbol })}
          </Label>
          <div className="flex items-center bg-secondary border border-border rounded-md px-3 py-1.5">
            <Input
              type="number"
              value={orderQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              onBlur={handleQuantityBlur}
              className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 no-spinner"
              readOnly={!isHost}
            />
            <span className="text-muted-foreground text-xs">{symbol}</span>
          </div>
        </div>

        {orderType === "limit" && (
          <div>
            <Label className="block text-muted-foreground mb-1 text-xs">
              {t("inputs.orderAmount", { quote: "USDT" })}
            </Label>
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
                  // derive quantity, then round/clamp
                  const qtyRaw = (Number(e.target.value) * leverage) / price;
                  const qtyRounded = roundToStep(qtyRaw, qtyStep);
                  const qtyClamped = clamp(qtyRounded, minQty, maxQty);
                  setOrderQuantity(qtyClamped.toFixed(6));
                }}
                step="0.0001"
                readOnly={!isHost}
                className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 no-spinner"
              />
              <span className="text-muted-foreground text-xs">USDT</span>
            </div>
            {!hasEnoughBalance && (
              <div className="text-xs text-red-500 mt-1">
                {t("errors.insufficientBalance")}
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
          <span>{t("info.fee")}</span>
          <span>{fee.toFixed(2)} USDT</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t("info.leverage")}</span>
          <span>{leverageValue.toFixed(2)}x</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t("info.positionSize", { quote: "USDT" })}</span>
          <span>{positionSize.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t("info.initialMargin", { quote: "USDT" })}</span>
          <span>{initialMargin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t("info.estLiqLong")}</span>
          <span className="text-red-500">
            {liqPriceLong > 0 ? liqPriceLong.toFixed(2) : "-"}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t("info.estLiqShort")}</span>
          <span className="text-green-500">
            {liqPriceShort > 0 ? liqPriceShort.toFixed(2) : "-"}
          </span>
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-background pt-2 mt-auto border-t border-border">
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-xs font-medium"
                disabled={!isHost || !hasEnoughBalance}
                title={
                  !isHost
                    ? t("tooltips.onlyHost")
                    : !hasEnoughBalance
                    ? t("errors.insufficientBalance")
                    : undefined
                }
                onClick={() => setOrderSide("long")}
              >
                {t("actions.buyLong")}
              </Button>
            </DialogTrigger>
            <DialogContent className="!sm:max-w-md rounded-xl border border-border bg-background p-0">
              <div className="px-6 pt-5 pb-2">
                <DialogTitle className="text-lg font-semibold mb-2">
                  {t("confirm.titleBuy")}
                </DialogTitle>
                <p className="text-muted-foreground text-sm mb-4">
                  {t("confirm.subtitle")}
                </p>
                <div className="rounded-md border border-border bg-muted/50 px-4 py-3 mb-2">
                  <div className="grid gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.pair")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.direction")}
                      </span>
                      <span className="font-semibold text-[15px] text-green-500">
                        {t("actions.buyLong")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.orderType")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {orderType === "market"
                          ? t("tabs.market")
                          : t("tabs.limit")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.quantity")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {orderQuantity || "0"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.price")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {orderType === "market"
                          ? `${t("confirm.marketPrice")} ${format2(
                              currentPrice
                            )}`
                          : `${format2(orderPrice)} USDT`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.leverage")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {leverage}x
                      </span>
                    </div>
                    {(() => {
                      const m = computeMarginLevel();
                      if (!m) return null;
                      return (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium text-[15px]">
                            {t("marginLevel.title", {
                              default: "Margin Level",
                            })}
                          </span>
                          <span
                            className={`font-semibold text-[15px] ${
                              m.key === "safe"
                                ? "text-green-500"
                                : m.key === "caution"
                                ? "text-amber-500"
                                : "text-red-500"
                            }`}
                            title={t("marginLevel.distance", {
                              percent: m.percent,
                              default: `Distance to liquidation: ${m.percent}%`,
                            })}
                          >
                            {t(`marginLevel.${m.key}`)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted/50 px-4 py-3 mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-semibold text-[20px]">
                      {t("confirm.total")}
                    </span>
                    <span className="font-bold text-[22px] text-green-500">
                      ${Number(orderAmount || 0).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-6">
                <div className="rounded-md border border-border bg-muted/50 px-4 py-4 mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground">
                      {t("tpsl.positionHeader", {
                        default: "Position TP/SL (optional)",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("tpsl.hint", { default: "Set % to auto-close" })}
                    </span>
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-muted-foreground">
                        {t("tpsl.takeProfit", { default: "Take Profit (%)" })}
                      </Label>
                      <div className="flex items-center gap-2 w-44">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          placeholder="1.5"
                          value={tpOnEntryPercent}
                          onChange={(e) => setTpOnEntryPercent(e.target.value)}
                          className="h-9 text-sm text-right"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-muted-foreground">
                        {t("tpsl.stopLoss", { default: "Stop Loss (%)" })}
                      </Label>
                      <div className="flex items-center gap-2 w-44">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          placeholder="1.0"
                          value={slOnEntryPercent}
                          onChange={(e) => setSlOnEntryPercent(e.target.value)}
                          className="h-9 text-sm text-right"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 pb-5 pt-5">
                <DialogClose asChild>
                  <Button variant="secondary" className="w-28 h-10">
                    {t("common.cancel")}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="success"
                    className="w-28 h-10"
                    onClick={handleConfirmOrder}
                    disabled={loading}
                  >
                    {loading ? t("confirm.confirming") : t("common.confirm")}
                  </Button>
                </DialogClose>
              </DialogFooter>
              {error && (
                <div className="px-6 pb-4">
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    {error}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white h-9 text-xs font-medium"
                disabled={!isHost || !hasEnoughBalance}
                title={
                  !isHost
                    ? t("tooltips.onlyHost")
                    : !hasEnoughBalance
                    ? t("errors.insufficientBalance")
                    : undefined
                }
                onClick={() => setOrderSide("short")}
              >
                {t("actions.sellShort")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl border border-border bg-background p-0">
              <div className="px-6 pt-5 pb-2">
                <DialogTitle className="text-lg font-semibold mb-2">
                  {t("confirm.titleSell")}
                </DialogTitle>
                <p className="text-muted-foreground text-sm mb-4">
                  {t("confirm.subtitle")}
                </p>
                <div className="rounded-md border border-border bg-muted/50 px-4 py-3 mb-2">
                  <div className="grid gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.pair")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.direction")}
                      </span>
                      <span className="font-semibold text-[15px] text-red-500">
                        {t("actions.sellShort")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.orderType")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {orderType === "market"
                          ? t("tabs.market")
                          : t("tabs.limit")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.quantity")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {orderQuantity || "0"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.price")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {orderType === "market"
                          ? `${t("confirm.marketPrice")} ${format2(
                              currentPrice
                            )}`
                          : `${format2(orderPrice)} USDT`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[15px]">
                        {t("confirm.leverage")}
                      </span>
                      <span className="font-semibold text-[15px]">
                        {leverage}x
                      </span>
                    </div>
                    {(() => {
                      const m = computeMarginLevel();
                      if (!m) return null;
                      return (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium text-[15px]">
                            {t("marginLevel.title", {
                              default: "Margin Level",
                            })}
                          </span>
                          <span
                            className={`font-semibold text-[15px] ${
                              m.key === "safe"
                                ? "text-green-500"
                                : m.key === "caution"
                                ? "text-amber-500"
                                : "text-red-500"
                            }`}
                            title={t("marginLevel.distance", {
                              percent: m.percent,
                              default: `Distance to liquidation: ${m.percent}%`,
                            })}
                          >
                            {t(`marginLevel.${m.key}`)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted/50 px-4 py-3 mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-semibold text-[20px]">
                      {t("confirm.total")}
                    </span>
                    <span className="font-bold text-[22px] text-red-500">
                      ${Number(orderAmount || 0).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-6">
                <div className="rounded-md border border-border bg-muted/50 px-4 py-4 mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground">
                      {t("tpsl.positionHeader", {
                        default: "Position TP/SL (optional)",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("tpsl.hint", { default: "Set % to auto-close" })}
                    </span>
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-muted-foreground">
                        {t("tpsl.takeProfit", { default: "Take Profit (%)" })}
                      </Label>
                      <div className="flex items-center gap-2 w-44">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          placeholder="1.5"
                          value={tpOnEntryPercent}
                          onChange={(e) => setTpOnEntryPercent(e.target.value)}
                          className="h-9 text-sm text-right"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs text-muted-foreground">
                        {t("tpsl.stopLoss", { default: "Stop Loss (%)" })}
                      </Label>
                      <div className="flex items-center gap-2 w-44">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          placeholder="1.0"
                          value={slOnEntryPercent}
                          onChange={(e) => setSlOnEntryPercent(e.target.value)}
                          className="h-9 text-sm text-right"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 pb-5 pt-5">
                <DialogClose asChild>
                  <Button variant="secondary" className="w-28 h-10">
                    {t("common.cancel")}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="destructive"
                    className="w-28 h-10"
                    onClick={handleConfirmOrder}
                    disabled={loading}
                  >
                    {loading ? t("confirm.confirming") : t("common.confirm")}
                  </Button>
                </DialogClose>
              </DialogFooter>
              {error && (
                <div className="px-6 pb-4">
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    {error}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
