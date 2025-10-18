import type { RiskMessageProps } from "./types";

export const RiskMessage = ({
  show,
  triggerPrice,
  percentage,
  isProfit,
}: RiskMessageProps) => {
  if (!show || percentage <= 0) return null;
  const amount = (triggerPrice * 0.1 * (percentage / 100)).toFixed(4);
  return (
    <div className="mt-4 p-3 bg-muted/30 border border-border rounded-md">
      <div className="text-xs text-muted-foreground leading-relaxed">
        Last Traded Price to{" "}
        <span className="font-semibold text-foreground">
          {triggerPrice.toLocaleString()}
        </span>{" "}
        will trigger market {isProfit ? "Take Profit" : "Stop Loss"} order; your{" "}
        {isProfit ? "expected profit" : "expected loss"} will be{" "}
        <span
          className={`font-semibold ${isProfit ? "text-profit" : "text-loss"}`}
        >
          {amount} USDT
        </span>{" "}
        (ROI:{" "}
        <span
          className={`font-semibold ${isProfit ? "text-profit" : "text-loss"}`}
        >
          {isProfit ? percentage.toFixed(2) : `-${percentage.toFixed(2)}`}%
        </span>
        ).
      </div>
    </div>
  );
};
