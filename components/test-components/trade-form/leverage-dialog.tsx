import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import React, { useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

declare global {
  interface Window {
    _limit_user_capital_ref?: { current: number };
  }
}

interface LeverageDialogProps {
  open: boolean;
  value: number; // 1..100
  onChange: (v: number) => void; // live update
  onClose: () => void;
  onConfirm?: (v: number) => void;
  availableBalance?: number;
  currentPrice?: number;
  side?: "long" | "short"; // Add side parameter for liquidation calculation
}

const TICK_MARKS = [1, 10, 25, 50, 75, 100, 125] as const;

function LeverageDialogInner({
  open,
  value,
  onChange,
  onClose,
  onConfirm,
  availableBalance = 10000,
  currentPrice = 50000,
  side = "long",
}: LeverageDialogProps) {
  const t = useTranslations("trade.form");
  const formatted = useMemo(() => String(Math.round(value)), [value]);
  const tickMarks = TICK_MARKS;

  // Coalesce rapid value updates from slider/input to avoid blocking UI
  const rafRef = useRef<number | null>(null);
  const lastValueRef = useRef<number>(value);
  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  const scheduleChange = (next: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const clamped = Math.max(1, Math.min(125, Math.round(next)));
      if (clamped !== lastValueRef.current) {
        lastValueRef.current = clamped;
        onChange(clamped);
      }
    });
  };

  const userCapital =
    (typeof window !== "undefined" &&
      window._limit_user_capital_ref?.current) ||
    availableBalance;

  const positionSize = userCapital * value;
  const marginRequired = userCapital;
  const maintenanceMarginRate = 0.005;

  // Calculate liquidation price based on side
  const liquidationPrice =
    side === "long"
      ? currentPrice * (1 - 1 / value + maintenanceMarginRate) // Long: liquidated if price falls
      : currentPrice * (1 + 1 / value - maintenanceMarginRate); // Short: liquidated if price rises

  // High leverage warning
  const isHighLeverage = value >= 50;
  // const isExtremeLeverage = value >= 100;

  const handleTickKeyDown = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    m: number
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(m);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!sm:max-w-xl !max-w-xl w-full gap-0 py-4 px-2 overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-base">{t("leverage.title")}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div>
            <div className="text-xs text-muted-foreground">{t("leverage.label")}</div>
            <div className="mt-2">
              <Input
                type="number"
                min={1}
                max={100}
                step={1}
                value={formatted}
                onChange={(e) => scheduleChange(Number(e.target.value) || 1)}
                className="text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <Slider
              value={[value]}
              onValueChange={(val) => scheduleChange(val[0])}
              min={1}
              max={125}
              step={1}
              className="w-full"
              aria-label={t("leverage.sliderA11y")}
            />
            <div
              className="text-muted-foreground mt-3 relative w-full text-[11px] font-medium pb-8"
              aria-hidden="true"
            >
              {tickMarks.map((m) => {
                const position = ((m - 1) / (125 - 1)) * 100;
                return (
                  <span
                    key={m}
                    role="button"
                    tabIndex={0}
                    onClick={() => onChange(m)}
                    onKeyDown={(e) => handleTickKeyDown(e, m)}
                    className="absolute flex flex-col items-center justify-center gap-1 cursor-pointer select-none transform -translate-x-1/2"
                    style={{ left: `${position}%` }}
                  >
                    <span className="bg-muted-foreground/70 h-1 w-px" />
                    <span>{m}x</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* High Leverage Warning */}
          {isHighLeverage && (
            <div className="rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs font-medium text-yellow-600 leading-relaxed">
                  {t("leverage.warningHigh")}
                </div>
              </div>
            </div>
          )}

          {/* Live Calculations */}
          <div className="space-y-3 p-3 bg-accent/20 rounded-lg border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">{t("calc.title")}</div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("calc.positionSize")}</span>
                <span className="text-foreground font-medium">
                  ${positionSize.toFixed(2)} USDT
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("calc.marginRequired")}</span>
                <span className="text-foreground font-medium">
                  {marginRequired.toFixed(2)} USDT
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("calc.liquidationPrice", { side })}</span>
                <span
                  className={`font-medium ${
                    (side === "long" &&
                      liquidationPrice < currentPrice * 0.8) ||
                    (side === "short" && liquidationPrice > currentPrice * 1.2)
                      ? "text-red-600"
                      : "text-foreground"
                  }`}
                >
                  ${liquidationPrice.toFixed(0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("calc.availableBalance")}</span>
                <span className="text-foreground font-medium">
                  {availableBalance.toFixed(2)} USDT
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="w-full px-5 py-4 bg-background/60 border-t border-border">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              className="w-full h-10"
              onClick={() => {
                if (typeof onConfirm === "function") onConfirm(value);
                onClose();
              }}
            >
              {t("buttons.confirm")}
            </Button>
            <Button className="w-full h-10" variant="outline" onClick={onClose}>
              {t("buttons.cancel")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const LeverageDialog = React.memo(LeverageDialogInner);
