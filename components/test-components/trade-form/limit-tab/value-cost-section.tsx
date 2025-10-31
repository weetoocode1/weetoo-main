import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface ValueCostSectionProps {
  price: number;
  qty: number;
  availableBalance: number;
  feeRate: number;
  leverage?: number; // for liquidation calc
  orderType?: "market" | "limit"; // to show ~ for market orders
}

export function ValueCostSection({
  price,
  qty,
  availableBalance,
  feeRate,
  leverage = 1,
  orderType = "limit",
}: ValueCostSectionProps) {
  const t = useTranslations("trade.form");
  // Position value (notional)
  const orderValue = price * qty;
  // Initial margin (what user actually pays up-front). This stays constant when leverage changes if user capital is fixed.
  const initialMargin = leverage > 0 ? orderValue / leverage : 0;
  // Trading fee on notional
  const fee = orderValue * feeRate;
  // Total Cost shown in UI = Initial Margin + Fee
  const totalCost = initialMargin + fee;

  const isInsufficient = totalCost > availableBalance && totalCost > 0;

  // Simple liquidation price calculator (approximate):
  // Uses a tiny maintenance margin rate; refine later as needed.
  const MMR = 0.005; // 0.5% simple default
  const calcLiqPrice = (side: "long" | "short") => {
    if (!qty || !price || leverage <= 0) return 0;
    const initialMargin = (price * qty) / leverage;
    const maintenance = price * qty * MMR;
    if (side === "long") {
      const liq = price - (initialMargin - maintenance) / qty;
      return liq > 0 ? liq : 0;
    }
    const liq = price + (initialMargin - maintenance) / qty;
    return liq > 0 ? liq : 0;
  };

  // const [liq, setLiq] = ((): [number, (n: number) => void] => {
  //   let v = 0;
  //   return [v, (n) => (v = n)];
  // })();

  // Format numbers with proper precision
  const formatNumber = (num: number) => {
    if (!Number.isFinite(num)) return "0.00";
    if (Math.abs(num) < 0.01 && num !== 0) return num.toFixed(6);
    // Force deterministic locale to avoid SSR/CSR hydration mismatches
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-3 py-4 border border-border rounded-lg p-4 bg-accent/20">
      <div className="space-y-3">
        {/* Available Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/60"></div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("valueCost.availableBalance")}
            </span>
          </div>
          <div className="min-w-[140px] text-right tabular-nums font-mono">
            <span className="text-[13px] font-semibold text-foreground font-mono">
              {formatNumber(availableBalance)} USDT
            </span>
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500/60"></div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("quantity.label")}
            </span>
          </div>
          <div className="min-w-[140px] text-right tabular-nums font-mono">
            <span className="text-[13px] font-semibold text-foreground font-mono">
              {formatNumber(qty)} BTC
            </span>
          </div>
        </div>

        {/* Order Amount (Margin) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/60"></div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("valueCost.orderAmount")}
            </span>
          </div>
          <div className="min-w-[140px] text-right tabular-nums font-mono flex items-center justify-end gap-1">
            <span className="text-[13px] font-semibold text-foreground font-mono">
              {orderType === "market" ? "~" : ""}
              {formatNumber(initialMargin)} USDT
            </span>
            {orderType === "market" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("valueCost.marketInfoAria")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {t("valueCost.marketInfo")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Fee */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40"></div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("valueCost.fee", { rate: (feeRate * 100).toFixed(2) })}
            </span>
          </div>
          <div className="min-w-[140px] text-right tabular-nums font-mono">
            <span className="text-[13px] font-medium text-muted-foreground font-mono">
              {formatNumber(fee)} USDT
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50"></div>

        {/* Total Cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-foreground/80"></div>
            <span className="text-xs font-semibold text-foreground">
              {t("valueCost.totalCost")}
            </span>
          </div>
          <div className="min-w-[140px] text-right tabular-nums font-mono">
            <span
              className={`text-base font-bold font-mono ${
                isInsufficient ? "text-red-500" : "text-foreground"
              }`}
            >
              {formatNumber(totalCost)} USDT
            </span>
          </div>
        </div>

        {isInsufficient && (
          <div className="mt-3 rounded-md border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 px-3 py-2 text-xs leading-relaxed">
            {t("valueCost.insufficient")}
          </div>
        )}

        {/* Liquidation Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40"></div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs font-medium text-muted-foreground border-b border-dotted border-muted-foreground cursor-help">
                    {t("valueCost.liquidationPrice")}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] w-full">
                  <p className="text-xs">
                    {t("valueCost.liqTooltip")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="min-w-[140px] text-right tabular-nums font-mono">
            <button
              type="button"
              onClick={() => {
                // Assume long by default for now; refine to actual side later
                const liqPrice = calcLiqPrice("long");
                // simple inline display via alert-style fallback; in UI we replace text label
                const el = document.getElementById("liq-output");
                if (el)
                  el.textContent = liqPrice
                    ? formatNumber(liqPrice) + " USDT"
                    : "--";
              }}
              className="text-xs font-medium text-muted-foreground cursor-pointer"
            >
              {t("valueCost.calculate")}
            </button>
          </div>
        </div>

        {/* Liq output row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40"></div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("valueCost.liqEst")}
            </span>
          </div>
          <div
            id="liq-output"
            className="min-w-[140px] text-right tabular-nums font-mono text-[13px] text-foreground"
          >
            --
          </div>
        </div>
      </div>
    </div>
  );
}
