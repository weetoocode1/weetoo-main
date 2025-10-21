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
import { useMemo } from "react";

interface LeverageDialogProps {
  open: boolean;
  value: number; // 1..100
  onChange: (v: number) => void; // live update
  onClose: () => void;
  availableBalance?: number;
  currentPrice?: number;
  side?: "long" | "short"; // Add side parameter for liquidation calculation
}

export function LeverageDialog({
  open,
  value,
  onChange,
  onClose,
  availableBalance = 10000,
  currentPrice = 50000,
  side = "long",
}: LeverageDialogProps) {
  const formatted = useMemo(() => String(Math.round(value)), [value]);
  const tickMarks = [1, 10, 25, 50, 75, 100, 125];

  // Real calculations using actual data
  const positionSize = (availableBalance * value) / currentPrice;
  const marginRequired = availableBalance; // Using ALL available balance
  const maintenanceMarginRate = 0.005; // 0.5%

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
            <DialogTitle className="text-base">Adjust Leverage</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div>
            <div className="text-xs text-muted-foreground">Leverage</div>
            <div className="mt-2">
              <Input
                type="number"
                min={1}
                max={100}
                step={1}
                value={formatted}
                onChange={(e) =>
                  onChange(
                    Math.max(
                      1,
                      Math.min(125, Math.round(Number(e.target.value) || 1))
                    )
                  )
                }
                className="text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <Slider
              value={[value]}
              onValueChange={(val) =>
                onChange(Math.max(1, Math.min(125, Math.round(val[0]))))
              }
              min={1}
              max={125}
              step={1}
              className="w-full"
              aria-label="Leverage slider"
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
                  The current leverage is too high. There is a high risk of
                  immediate liquidation. Please adjust your position.
                </div>
              </div>
            </div>
          )}

          {/* Live Calculations */}
          <div className="space-y-3 p-3 bg-accent/20 rounded-lg border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Live Calculations
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Position Size</span>
                <span className="text-foreground font-medium">
                  {positionSize.toFixed(4)} BTC
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Margin Required</span>
                <span className="text-foreground font-medium">
                  {marginRequired.toFixed(2)} USDT
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Liquidation Price ({side})
                </span>
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
                <span className="text-muted-foreground">
                  Max Position Value
                </span>
                <span className="text-foreground font-medium">
                  {(positionSize * currentPrice).toLocaleString()} USDT
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="w-full px-5 py-4 bg-background/60 border-t border-border">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button className="w-full h-10" onClick={onClose}>
              Confirm
            </Button>
            <Button className="w-full h-10" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
