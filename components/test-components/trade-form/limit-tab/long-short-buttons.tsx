"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface LongShortButtonsProps {
  price: number;
  qty: number;
  orderType: "limit" | "market";
  symbol?: string;
  leverage?: number;
  feeRate: number; // e.g., 0.0005
  onConfirm?: (params: {
    side: "LONG" | "SHORT";
    price: number;
    qty: number;
    orderType: "limit" | "market";
    symbol?: string;
    leverage?: number;
    orderValue: number;
    fee: number;
    totalCost: number;
  }) => void;
}

export function LongShortButtons({
  price,
  qty,
  orderType,
  symbol,
  leverage = 1,
  feeRate,
  onConfirm,
}: LongShortButtonsProps) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const calcLiq = (entry: number, lev: number, s: "LONG" | "SHORT") => {
    // Simplified est. liquidation
    const mmr = 0.004; // 0.4%
    if (!entry || !lev) return 0;
    return s === "LONG"
      ? entry * (1 - 1 / lev + mmr)
      : entry * (1 + 1 / lev - mmr);
  };

  const { orderValue, fee, totalCost, canConfirm } = useMemo(() => {
    const ov = (Number(price) || 0) * (Number(qty) || 0);
    const f = ov * (Number(feeRate) || 0);
    const tc = ov + f;
    const ok = ov > 0 && Number.isFinite(ov) && (Number(price) || 0) > 0;
    return { orderValue: ov, fee: f, totalCost: tc, canConfirm: ok };
  }, [price, qty, feeRate]);

  const formatUSDT = (n: number) =>
    Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";
  const formatBTC = (n: number) =>
    Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 8,
        })
      : "0";

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm?.({
      side,
      price,
      qty,
      orderType,
      symbol,
      leverage,
      orderValue,
      fee,
      totalCost,
    });
    // Show success toast similar to QuickTradePanel/Market tab
    try {
      const msg = `${side === "LONG" ? "Long" : "Short"} order placed`;
      const formattedPrice = Number(price).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      toast.success(msg, {
        description: `${qty} ${symbol || "BTCUSDT"} at ${formattedPrice}`,
      });
    } catch {}
    setOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          onClick={() => {
            setSide("LONG");
            setOpen(true);
          }}
          className="h-12 text-sm font-medium bg-profit hover:bg-profit/90 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-md"
        >
          Long/Buy
        </Button>
        <Button
          type="button"
          onClick={() => {
            setSide("SHORT");
            setOpen(true);
          }}
          className="h-12 text-sm font-medium bg-loss hover:bg-loss/90 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-md"
        >
          Short/Sell
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />

          {/* Dialog Content */}
          <div
            className="relative z-50 w-full max-w-lg mx-4 bg-background border border-border rounded-lg p-6 shadow-lg animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-0 mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                Confirm {side === "LONG" ? "Long / Buy" : "Short / Sell"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-border cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-5">
              <div className="rounded-md border divide-y border-border bg-background/60">
                <KV label="Symbol" value={`${symbol || "USDT Perp"}`} />
                <KV
                  label="Type"
                  value={`${side === "LONG" ? "Long / Buy" : "Short / Sell"}`}
                />
                <KV label="Order Type" value={`${orderType}`} />
                <KV label="Leverage" value={`${Math.round(leverage)}x`} />
                <KV label="Entry Price" value={`${formatUSDT(price)} USDT`} />
                <KV label="Quantity" value={`${formatBTC(qty)} BTC`} />
                <KV
                  label="Order Value"
                  value={`${orderType === "market" ? "~" : ""}${formatUSDT(
                    orderValue
                  )} USDT`}
                />
                <KV
                  label={`Fee (${(feeRate * 100).toFixed(2)}%)`}
                  value={`${formatUSDT(fee)} USDT`}
                />
                <KV
                  label="Liquidation (est.)"
                  value={`${formatUSDT(
                    calcLiq(price, leverage || 1, side)
                  )} USDT`}
                />
              </div>

              <div className="rounded-md border border-border bg-accent/20 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Total Cost</span>
                <span className="text-xl font-bold tabular-nums font-mono">
                  {formatUSDT(totalCost)} USDT
                </span>
              </div>

              {!canConfirm && (
                <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                  Please enter a valid price and quantity to continue.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                  className={`${
                    side === "LONG"
                      ? "bg-profit hover:bg-profit/90 h-10"
                      : "bg-loss hover:bg-loss/90 h-10"
                  } text-white h-10`}
                >
                  {side === "LONG" ? "Confirm Long" : "Confirm Short"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 bg-transparent"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Small row component for cleaner layout
// function Row({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="flex items-center justify-between px-4 py-3 text-sm">
//       <span className="text-muted-foreground text-[12px]">{label}</span>
//       <span className="font-medium tabular-nums font-mono text-[13px]">
//         {value}
//       </span>
//     </div>
//   );
// }

// function Metric({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="rounded-md border border-border bg-background/60 px-3 py-2">
//       <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
//       <div className="text-[13px] font-semibold tabular-nums font-mono">
//         {value}
//       </div>
//     </div>
//   );
// }

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums font-mono">
        {value}
      </span>
    </div>
  );
}
