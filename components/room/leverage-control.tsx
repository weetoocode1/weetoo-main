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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLeverageStore } from "@/lib/store/leverage-store";
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

type OrderType = "limit" | "market";
type OrderSide = "long" | "short";

export interface LeverageControlProps {
  isHost: boolean;
  orderType: OrderType;
  currentPrice?: number;
  orderPrice: string;
  leverage: number;
  setLeverage: (val: number) => void;
  priceTick: number;
  qtyStep: number;
  minQty: number;
  maxQty: number;
  safeVirtualBalance: number;
  symbol: string;
  currentBase: string;
  orderQuantity: string;
  orderAmount: string;
  setOrderQuantity: (v: string) => void;
  setOrderAmount: (v: string) => void;
  openPositions?: { symbol: string; size: number }[];
  orderSide: OrderSide;
  maintenanceMarginRate: number;
}

const roundToStep = (value: number, step: number) =>
  step > 0 ? Math.round(value / step) * step : value;
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const format2 = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
};

export default function LeverageControl(props: LeverageControlProps) {
  const t = useTranslations("room.tradingForm");
  const {
    isHost,
    orderType,
    currentPrice,
    orderPrice,
    leverage,
    setLeverage,
    priceTick,
    qtyStep,
    minQty,
    maxQty,
    safeVirtualBalance,
    // symbol,
    currentBase,
    orderQuantity,
    orderAmount,
    setOrderQuantity,
    setOrderAmount,
    openPositions = [],
    orderSide,
    maintenanceMarginRate,
  } = props;

  const {
    pendingLeverage,
    setPendingLeverage,
    showLeverageModal,
    setShowLeverageModal,
    advisorSlPercent,
    setAdvisorSlPercent,
    riskPercent,
    setRiskPercent,
    advisorApplied,
    setAdvisorApplied,
  } = useLeverageStore();

  const positionSizeSnapshotRef = useRef<number | null>(null);

  const price =
    orderType === "market"
      ? Number(currentPrice) || 0
      : Number(orderPrice) || 0;
  const qtyNum = Number(orderQuantity) || 0;
  const amtNum = Number(orderAmount) || 0;

  // const positionSize = price * qtyNum;

  const advisor = useMemo(() => {
    const entry = Number(price);
    const riskPct = Number(riskPercent);
    const slPct = Number(advisorSlPercent || 0);
    const balance = safeVirtualBalance;
    const effectiveLeverage = pendingLeverage || leverage;
    if (!entry || !riskPct || !balance || !effectiveLeverage) return null;
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
    const capacityQty = (balance * effectiveLeverage) / entry;
    const suggestedQty = Math.max(0, Math.min(rawQty, capacityQty));
    const symbolQtyStep = 0.000001;
    const roundedQty = Math.floor(suggestedQty / symbolQtyStep) * symbolQtyStep;
    const requiredMargin = (entry * roundedQty) / effectiveLeverage;
    const estLoss = lossPerUnit * roundedQty;
    const roeAtStop = (-estLoss / (requiredMargin || 1)) * 100 || 0;
    const capped = suggestedQty < rawQty - 1e-9;
    return {
      stopPrice,
      roundedQty,
      requiredMargin,
      estLoss,
      roeAtStop,
      capped,
    };
  }, [
    advisorSlPercent,
    leverage,
    orderSide,
    pendingLeverage,
    price,
    priceTick,
    riskPercent,
    safeVirtualBalance,
  ]);

  const conservative = useMemo(() => {
    const entry = Number(price);
    const tmpSl = advisorSlPercent || 1.0;
    const stop =
      orderSide === "long"
        ? entry * (1 - tmpSl / 100)
        : entry * (1 + tmpSl / 100);
    const lossPerUnit = Math.abs(entry - stop);
    if (!entry || !lossPerUnit) return 0;
    const raw = (safeVirtualBalance * (0.5 / 100)) / lossPerUnit;
    const cap = (safeVirtualBalance * leverage) / entry;
    const qty = Math.min(raw, cap);
    const rounded = Math.floor(qty / qtyStep) * qtyStep;
    return rounded;
  }, [
    advisorSlPercent,
    leverage,
    orderSide,
    price,
    qtyStep,
    safeVirtualBalance,
  ]);

  const moderate = useMemo(() => {
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
  }, [
    advisorSlPercent,
    leverage,
    orderSide,
    price,
    qtyStep,
    safeVirtualBalance,
  ]);

  const aggressive = useMemo(() => {
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
  }, [
    advisorSlPercent,
    leverage,
    orderSide,
    price,
    qtyStep,
    safeVirtualBalance,
  ]);

  const maximumSafe = useMemo(() => {
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
  }, [
    advisorSlPercent,
    leverage,
    orderSide,
    price,
    qtyStep,
    safeVirtualBalance,
  ]);

  const totalExposure = useMemo(
    () => openPositions.reduce((sum, p) => sum + Number(p.size || 0), 0),
    [openPositions]
  );
  // const afterExposure = totalExposure + (positionSize || 0);
  const exposurePct =
    safeVirtualBalance > 0 ? (totalExposure / safeVirtualBalance) * 100 : 0;

  const onOpenClick = () => {
    if (!isHost) return;
    setPendingLeverage(leverage);
    setShowLeverageModal(true);
    if (price > 0 && qtyNum > 0) {
      positionSizeSnapshotRef.current = (qtyNum * price) / leverage;
    } else if (amtNum > 0) {
      positionSizeSnapshotRef.current = amtNum;
    } else {
      positionSizeSnapshotRef.current = null;
    }
  };

  const onConfirm = () => {
    setLeverage(pendingLeverage);
    const hasInputs =
      (Number(orderAmount) || 0) > 0 || (Number(orderQuantity) || 0) > 0;
    if (!advisorApplied && hasInputs) {
      const p =
        orderType === "market"
          ? Number(currentPrice) || 0
          : Number(orderPrice) || Number(currentPrice) || 0;
      if (
        positionSizeSnapshotRef.current !== null &&
        p > 0 &&
        pendingLeverage > 0
      ) {
        const newQty = (positionSizeSnapshotRef.current * pendingLeverage) / p;
        setOrderQuantity(newQty.toFixed(6));
      }
    }
    setAdvisorApplied(false);
    // Prefill sensible defaults when user hasn't entered qty/amount yet (both market and limit)
    if (!hasInputs) {
      const p =
        orderType === "market"
          ? Number(currentPrice) || 0
          : Number(orderPrice) || Number(currentPrice) || 0;
      if (p > 0 && pendingLeverage > 0 && safeVirtualBalance > 0) {
        const defaultPercent = 5;
        const amt = (safeVirtualBalance * defaultPercent) / 100;
        const rawQty = (amt * pendingLeverage) / p;
        const qtyRounded = roundToStep(rawQty, qtyStep);
        const qtyClamped = clamp(qtyRounded, minQty, maxQty);
        setOrderAmount(amt.toFixed(2));
        setOrderQuantity(qtyClamped.toFixed(6));
      }
    }
    setShowLeverageModal(false);
  };

  // Live update qty/amount while adjusting pending leverage (market only), mirroring original behavior
  useEffect(() => {
    if (advisorApplied) return;
    if (orderType === "limit") return;
    const p = price;
    if (!p || !pendingLeverage) return;
    const aNum = Number(orderAmount);
    const qNum = Number(orderQuantity);
    if (Number.isFinite(aNum) && aNum > 0) {
      const q = (aNum * pendingLeverage) / p;
      setOrderQuantity(q.toFixed(6));
      return;
    }
    if (Number.isFinite(qNum) && qNum > 0) {
      const a = (qNum * p) / pendingLeverage;
      setOrderAmount(a.toFixed(2));
    }
  }, [
    pendingLeverage,
    advisorApplied,
    orderAmount,
    orderQuantity,
    orderType,
    price,
    setOrderAmount,
    setOrderQuantity,
  ]);

  return (
    <div className="relative pl-1">
      <Dialog open={showLeverageModal} onOpenChange={setShowLeverageModal}>
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            onClick={onOpenClick}
            className="flex items-center justify-between gap-1 py-1.5 px-3 w-full text-xs font-medium"
            disabled={!isHost}
          >
            {leverage}x{" "}
            <span className="text-muted-foreground">
              <ChevronDownIcon className="h-4 w-4" />
            </span>
          </Button>
        </DialogTrigger>
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
                  setPendingLeverage(Math.max(1, pendingLeverage - 1))
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
                  setPendingLeverage(Math.min(100, pendingLeverage + 1))
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
                {[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((option) => (
                  <span
                    key={option}
                    className="cursor-pointer px-1"
                    onClick={() => setPendingLeverage(option)}
                    style={{ userSelect: "none" }}
                  >
                    {option}x
                  </span>
                ))}
              </div>
            </div>
            <div className="px-4 mt-4">
              <div className="mb-3">
                <Accordion
                  type="single"
                  defaultValue="advisorInputs"
                  className="w-full space-y-2 "
                >
                  <AccordionItem
                    value="advisorInputs"
                    className="border border-border rounded-md px-2"
                  >
                    <AccordionTrigger className="text-sm">
                      {t("positionSize.title", {
                        default: "Position Size Advisor",
                      })}{" "}
                      — {t("advisor.fields", { default: "Inputs & Metrics" })}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid md:grid-cols-2 gap-4 px-2 pb-2">
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
                              {t("tpsl.stopLoss", { default: "Stop Loss (%)" })}
                            </Label>
                            <div className="flex items-center gap-2 w-44">
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                min="0"
                                value={advisorSlPercent}
                                onChange={(e) =>
                                  setAdvisorSlPercent(Number(e.target.value))
                                }
                                className="h-9 text-sm text-right"
                              />
                              <span className="text-xs text-muted-foreground">
                                %
                              </span>
                            </div>
                          </div>
                        </div>
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
                              {advisor ? advisor.roundedQty.toFixed(6) : "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              {t("positionSize.requiredMargin", {
                                default: "Required Margin (USDT)",
                              })}
                            </div>
                            <div className="text-sm font-semibold">
                              {advisor ? format2(advisor.requiredMargin) : "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              {t("positionSize.estLoss", {
                                default: "Estimated Loss (USDT)",
                              })}
                            </div>
                            <div className="text-sm font-semibold text-red-500">
                              {advisor ? `-${format2(advisor.estLoss)}` : "-"}
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
                              {currentBase} {riskPercent === 1 ? "\u2190" : ""}
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
                              setOrderQuantity(advisor.roundedQty.toFixed(6));
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
                          ${format2(totalExposure)} ({format2(exposurePct)}%)
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
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
                        if (!entry || !pendingLeverage) return null;
                        const MMR = maintenanceMarginRate;
                        const liqPrice =
                          orderSide === "long"
                            ? entry * (1 - pendingLeverage * (1 - MMR))
                            : entry * (1 + pendingLeverage * (1 - MMR));
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
                        const buffer = Math.max(0, Math.abs(stop - liqPrice));
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
            <Button onClick={onConfirm} disabled={!isHost}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
