"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeRiskReward, format2 } from "@/lib/trading-form-utils";
import { useTranslations } from "next-intl";

type OrderType = "limit" | "market";

type ConfirmSnapshot = {
  entryPrice: number;
  quantity: number;
  amount: number;
  leverage: number;
  orderType: "limit" | "market";
  side: "long" | "short";
  symbol: string;
  marketAtOpen?: number;
  balanceAtOpen?: number;
} | null;

export default function SellShortButton(props: {
  isHost: boolean;
  hasEnoughBalance: boolean;
  symbol: string;
  orderType: OrderType;
  orderPrice: string;
  currentPrice?: number;
  leverage: number;
  orderQuantity: string;
  orderAmount: string;
  safeVirtualBalance: number;
  tpOnEntryPercent: string;
  slOnEntryPercent: string;
  setTpOnEntryPercent: (v: string) => void;
  setSlOnEntryPercent: (v: string) => void;
  MAINTENANCE_MARGIN_RATE: number;
  confirmSnapshot: ConfirmSnapshot;
  setConfirmSnapshot: (v: ConfirmSnapshot) => void;
  setOrderSide: (s: "long" | "short") => void;
  loading: boolean;
  error: string | null;
  handleConfirmOrder: () => void;
}) {
  const t = useTranslations("room.tradingForm");
  const {
    isHost,
    hasEnoughBalance,
    symbol,
    orderType,
    orderPrice,
    currentPrice,
    leverage,
    orderQuantity,
    orderAmount,
    safeVirtualBalance,
    tpOnEntryPercent,
    slOnEntryPercent,
    setTpOnEntryPercent,
    setSlOnEntryPercent,
    MAINTENANCE_MARGIN_RATE,
    confirmSnapshot,
    setConfirmSnapshot,
    setOrderSide,
    loading,
    error,
    handleConfirmOrder,
  } = props;

  // ===== Derived metrics for confirm dialog (computed once per render) =====
  const entry =
    confirmSnapshot?.entryPrice ??
    (Number(orderPrice) || Number(currentPrice) || 0);
  const market = (confirmSnapshot?.marketAtOpen ?? Number(currentPrice)) || 0;
  const qty = (confirmSnapshot?.quantity ?? (Number(orderQuantity) || 0)) || 0;
  const notional = qty * entry;
  const tpPct = Number(tpOnEntryPercent) || 0;
  const slPct = Number(slOnEntryPercent) || 0;
  const tpPriceDerived = tpPct ? entry * (1 - tpPct / 100) : 0;
  const slPriceDerived = slPct ? entry * (1 + slPct / 100) : 0;
  const deltaPct = market && entry ? ((entry - market) / market) * 100 : 0;
  const showDelta = Number.isFinite(deltaPct) && market > 0 && entry > 0;

  const rrCalc = computeRiskReward(entry, qty, slPct, tpPct, "short");
  const risk = rrCalc.riskAmount;
  const reward = rrCalc.rewardAmount;
  const rr = rrCalc.rr;
  const riskPctOfAccount =
    safeVirtualBalance > 0 && risk > 0 ? (risk / safeVirtualBalance) * 100 : 0;
  const riskPctOfPosition =
    notional > 0 && risk > 0 ? (risk / notional) * 100 : 0;
  const showHighRiskWarning = riskPctOfAccount > 2;

  const levNow = confirmSnapshot?.leverage ?? leverage;
  const liq =
    levNow > 0 && Number.isFinite(entry)
      ? entry * (1 + levNow * (1 - MAINTENANCE_MARGIN_RATE))
      : 0;
  const slToLiqPct =
    rrCalc.stopPrice && liq > 0
      ? ((liq - (rrCalc.stopPrice as number)) / entry) * 100
      : 0;
  const FEE_RATE = 0.0005;
  const marginUsd = Number(confirmSnapshot?.amount ?? orderAmount ?? 0);
  const feeUsd = marginUsd * FEE_RATE;
  const totalUsd = marginUsd + feeUsd;

  return (
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
          onClick={() => {
            setOrderSide("short");
            const frozenPrice =
              orderType === "market"
                ? Number(currentPrice) || 0
                : Number(orderPrice) || 0;
            setConfirmSnapshot({
              entryPrice: frozenPrice,
              quantity: Number(orderQuantity) || 0,
              amount: Number(orderAmount) || 0,
              leverage,
              orderType,
              side: "short",
              symbol,
              marketAtOpen: Number(currentPrice) || 0,
              balanceAtOpen: safeVirtualBalance,
            });
          }}
        >
          {t("actions.sellShort")}
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-3xl !sm:max-w-3xl rounded-xl border border-border bg-background p-0">
        <div className="px-6 pt-5 pb-2">
          <DialogTitle className="text-lg font-semibold mb-2">
            {t("confirm.titleSell")}
          </DialogTitle>
          <p className="text-muted-foreground text-sm mb-4">
            {t("confirm.subtitle")}
          </p>
          {/* 4 boxes in a 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Box 1: Basic Order Info */}
            <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.pair")}
                  </span>
                  <span className="font-semibold text-[13px]">{symbol}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.direction")}
                  </span>
                  <span className="font-semibold text-[13px] text-red-500">
                    {t("actions.sellShort")}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.orderType")}
                  </span>
                  <span className="font-semibold text-[13px]">
                    {(confirmSnapshot?.orderType ?? orderType) === "market"
                      ? t("tabs.market")
                      : t("tabs.limit")}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.quantity")}
                  </span>
                  <span className="font-semibold text-[13px]">
                    {confirmSnapshot
                      ? (confirmSnapshot.quantity || 0).toFixed(6)
                      : orderQuantity || "0"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.price")}
                  </span>
                  <span className="font-semibold text-[13px]">
                    {(confirmSnapshot?.orderType ?? orderType) === "market"
                      ? `${t("confirm.marketPrice")} ${format2(
                          confirmSnapshot?.entryPrice ?? currentPrice
                        )}`
                      : `${format2(
                          confirmSnapshot?.entryPrice ?? orderPrice
                        )} USDT`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.leverage")}
                  </span>
                  <span className="font-semibold text-[13px]">
                    {confirmSnapshot?.leverage ?? leverage}x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("info.positionSize", { quote: "USDT" })}
                  </span>
                  <span className="font-semibold text-[13px]">
                    ${format2(notional)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.marketPrice")}
                  </span>
                  <span className="font-semibold text-[13px]">
                    ${format2(market)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("confirm.entryVsMarket", { default: "Entry vs Market" })}
                  </span>
                  <span
                    className={`font-semibold text-[13px] ${
                      deltaPct < 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {showDelta
                      ? `${Math.abs(deltaPct).toFixed(2)}% ${
                          deltaPct === 0 ? "" : deltaPct < 0 ? "▼" : "▲"
                        }`
                      : "0.00%"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    {t("positionSize.liqPrice", {
                      default: "Liquidation Price",
                    })}
                  </span>
                  <span className="font-semibold text-[13px]">
                    {levNow > 1 && Number.isFinite(liq) && entry > 0
                      ? `$${format2(liq)}`
                      : "N/A"}
                  </span>
                </div>
                {liq > 0 && slPct > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-[12px]">
                      {t("positionSize.distanceToLiq", {
                        default: "Distance to Liquidation",
                      })}
                    </span>
                    <span className="font-semibold text-[13px]">
                      {slToLiqPct.toFixed(2)}%
                    </span>
                  </div>
                )}
                {/* Margin breakdown */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    Initial Margin Required
                  </span>
                  <span className="font-semibold text-[13px]">
                    ${format2(marginUsd)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    Maintenance Margin
                  </span>
                  <span className="font-semibold text-[13px]">
                    ${format2(marginUsd * MAINTENANCE_MARGIN_RATE)} (
                    {(MAINTENANCE_MARGIN_RATE * 100).toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium text-[12px]">
                    Free Margin After
                  </span>
                  <span className="font-semibold text-[13px]">
                    $
                    {format2(
                      (confirmSnapshot?.balanceAtOpen ?? safeVirtualBalance) -
                        marginUsd -
                        feeUsd
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Risk/Reward Analysis */}
            <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
              <div className="grid gap-2">
                {(tpPct > 0 || slPct > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-[12px]">
                      {t("confirm.riskReward", { default: "Risk / Reward" })}
                    </span>
                    <span className="font-semibold text-[13px]">
                      ${format2(risk)} / ${format2(reward)}
                      {rr > 0 ? ` • 1:${rr.toFixed(2)}` : ""}
                    </span>
                  </div>
                )}
                {rr > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[12px]">
                        Risk
                      </span>
                      <span className="font-semibold text-[13px]">
                        ${format2(risk)} (
                        {notional > 0
                          ? ((risk / notional) * 100).toFixed(2)
                          : "0.00"}
                        % of position)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[12px]">
                        Reward
                      </span>
                      <span className="font-semibold text-[13px]">
                        ${format2(reward)} (
                        {notional > 0
                          ? ((reward / notional) * 100).toFixed(2)
                          : "0.00"}
                        % of position)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-[12px]">
                        R:R
                      </span>
                      <span className="font-semibold text-[13px]">
                        {`1:${rr.toFixed(2)}`} {rr < 1.5 ? "⚠️" : ""}
                      </span>
                    </div>
                  </>
                )}
                {risk > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-[12px]">
                      {t("confirm.riskOfAccount", {
                        default: "Risk % of Account",
                      })}
                    </span>
                    <span className="font-semibold text-[13px]">
                      {riskPctOfAccount.toFixed(2)}%
                    </span>
                  </div>
                )}
                {risk > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-[12px]">
                      {t("confirm.risk", { default: "Risk" })} % of Position
                    </span>
                    <span className="font-semibold text-[13px]">
                      {riskPctOfPosition.toFixed(2)}%
                    </span>
                  </div>
                )}
                {showHighRiskWarning && (
                  <div className="text-[12px] font-semibold text-red-500">
                    Warning: Risk exceeds 2% of account
                  </div>
                )}
                {rr > 0 && rr < 1.5 && (
                  <div className="text-[12px] font-semibold text-amber-500">
                    Warning: R:R below recommended 1.5:1
                  </div>
                )}
                {(confirmSnapshot?.balanceAtOpen ?? safeVirtualBalance) > 0 &&
                  marginUsd /
                    (confirmSnapshot?.balanceAtOpen ?? safeVirtualBalance) >
                    0.1 && (
                    <div className="text-[12px] font-semibold text-amber-500">
                      Warning: Using{" "}
                      {(
                        (marginUsd /
                          (confirmSnapshot?.balanceAtOpen ??
                            safeVirtualBalance)) *
                        100
                      ).toFixed(2)}
                      % of account balance
                    </div>
                  )}
                {risk > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Risk ≈ {riskPctOfPosition.toFixed(2)}% of position at SL
                  </div>
                )}
                {slPct > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-[12px]">
                      {t("tpsl.stopLoss", { default: "Stop Loss" })}
                    </span>
                    <span className="font-semibold text-[13px]">
                      {slPct.toFixed(2)}% = ${format2(rrCalc.stopPrice)} (
                      {`-${format2(risk)}`})
                    </span>
                  </div>
                )}
                {tpPct > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-[12px]">
                      {t("tpsl.takeProfit", { default: "Take Profit" })}
                    </span>
                    <span className="font-semibold text-[13px]">
                      {tpPct.toFixed(2)}% = ${format2(rrCalc.takeProfitPrice)} (
                      {`+${format2(reward)}`})
                    </span>
                  </div>
                )}
                {/* Order Summary moved to Box 4 */}
              </div>
            </div>

            {/* Box 3: TP/SL Inputs */}
            <div className="order-3 rounded-md border border-border bg-muted/50 px-4 py-4">
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
                  <div className="flex items-center gap-2 w-52">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="1.5"
                      value={tpOnEntryPercent}
                      onChange={(e) => setTpOnEntryPercent(e.target.value)}
                      className="h-9 text-sm text-right flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      %
                    </span>
                  </div>
                </div>
                {/* TP Price input */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs text-muted-foreground">
                    Take Profit (Price)
                  </Label>
                  <div className="flex items-center gap-2 w-52">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={
                        tpPct > 0
                          ? (rrCalc.takeProfitPrice || tpPriceDerived).toFixed(
                              2
                            )
                          : ""
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (entry > 0 && v > 0) {
                          const pct = ((entry - v) / entry) * 100;
                          setTpOnEntryPercent(pct.toFixed(2));
                        }
                      }}
                      className="h-9 text-sm text-right flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      USDT
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs text-muted-foreground">
                    {t("tpsl.stopLoss", { default: "Stop Loss (%)" })}
                  </Label>
                  <div className="flex items-center gap-2 w-52">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="1.0"
                      value={slOnEntryPercent}
                      onChange={(e) => setSlOnEntryPercent(e.target.value)}
                      className="h-9 text-sm text-right flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      %
                    </span>
                  </div>
                </div>
                {/* SL Price input */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs text-muted-foreground">
                    Stop Loss (Price)
                  </Label>
                  <div className="flex items-center gap-2 w-52">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={
                        slPct > 0
                          ? (rrCalc.stopPrice || slPriceDerived).toFixed(2)
                          : ""
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (entry > 0 && v > 0) {
                          const pct = ((v - entry) / entry) * 100;
                          setSlOnEntryPercent(pct.toFixed(2));
                        }
                      }}
                      className="h-9 text-sm text-right flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      USDT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 4: Fees (Total at bottom) */}
            <div className="order-4 rounded-md border border-border bg-muted/50 px-4 py-3">
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-muted-foreground font-medium text-[12px]">
                  Entry Fee
                </span>
                <span className="justify-self-end text-[12px] font-semibold">
                  ${feeUsd.toFixed(2)} ({(FEE_RATE * 100).toFixed(2)}%)
                </span>
                <span className="text-muted-foreground font-medium text-[12px]">
                  Est. Exit Fee
                </span>
                <span className="justify-self-end text-[12px] font-semibold">
                  ${feeUsd.toFixed(2)}
                </span>
                <span className="text-muted-foreground font-medium text-[12px]">
                  Total Fees
                </span>
                <span className="justify-self-end text-[12px] font-semibold">
                  {(feeUsd * 2).toFixed(2)}
                </span>
                <span className="text-foreground font-semibold text-[13px] mt-1">
                  {t("confirm.total", { default: "Total" })}
                </span>
                <span className="justify-self-end font-extrabold text-[20px] text-red-500 mt-1">
                  ${totalUsd.toFixed(2)}
                </span>
              </div>
              {/* Professional Order Summary */}
              <div className="mt-3 text-[12px] text-muted-foreground">
                <div className="font-semibold text-foreground text-[12px] mb-1">
                  Order Summary
                </div>
                <div>
                  - Limit Sell {qty.toFixed(6)} {symbol.replace("USDT", "")} @ $
                  {format2(entry)}
                </div>
                {showDelta && (
                  <div>
                    - Executes if price reaches entry (
                    {Math.abs(deltaPct).toFixed(2)}%{" "}
                    {deltaPct > 0 ? "below" : "above"} market)
                  </div>
                )}
                {slPct > 0 && (
                  <div>
                    - Stop Loss: Market Buy @ ${format2(rrCalc.stopPrice)} (-$
                    {format2(risk)})
                  </div>
                )}
                {tpPct > 0 && (
                  <div>
                    - Take Profit: Limit Buy @ $
                    {format2(rrCalc.takeProfitPrice)} (+${format2(reward)})
                  </div>
                )}
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
              onClick={() => {
                if (confirmSnapshot) {
                  setOrderSide(confirmSnapshot.side);
                }
                handleConfirmOrder();
              }}
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
  );
}
