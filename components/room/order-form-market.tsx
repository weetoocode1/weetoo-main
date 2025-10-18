"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

type Props = {
  isHost: boolean;
  symbol: string;
  currentPrice?: number;
  orderQuantity: string;
  setOrderQuantity: (v: string) => void;
  orderAmount: string;
  setOrderAmount: (v: string) => void;
  leverage: number;
  qtyStep: number;
  minQty: number;
  maxQty: number;
  roundToStep: (v: number, s: number) => number;
  clamp: (v: number, min: number, max: number) => number;
};

export default function OrderFormMarket(props: Props) {
  const t = useTranslations("room.tradingForm");
  const {
    isHost,
    symbol,
    currentPrice,
    orderQuantity,
    setOrderQuantity,
    // orderAmount,
    setOrderAmount,
    leverage,
    qtyStep,
    minQty,
    maxQty,
    roundToStep,
    clamp,
  } = props;

  const price = Number(currentPrice) || 0;

  return (
    <div className="flex flex-col gap-3 mb-3">
      <div>
        <Label className="block text-muted-foreground mb-1 text-xs">
          {t("inputs.orderPrice", { quote: "USDT" })}
        </Label>
        <div className="flex items-center bg-secondary border border-border rounded-md px-3 py-1.5 relative">
          <Input
            type="number"
            value={price ? price.toFixed(2) : "0"}
            readOnly
            className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 pr-16 no-spinner"
          />
          <span className="text-muted-foreground text-xs">USDT</span>
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
            onChange={(e) => {
              const value = e.target.value;
              setOrderQuantity(value);
              const p = price;
              const num = Number(value);
              if (!p || !leverage || !Number.isFinite(num)) {
                setOrderAmount("");
                return;
              }
              setOrderAmount(((num * p) / leverage).toFixed(2));
            }}
            onBlur={() => {
              const num = Number(orderQuantity);
              if (!Number.isFinite(num)) {
                setOrderQuantity("");
                return;
              }
              const rounded = roundToStep(num, qtyStep);
              const clamped = clamp(rounded, minQty, maxQty);
              setOrderQuantity(clamped ? clamped.toFixed(6) : "");
              const p = price;
              if (p && leverage) {
                setOrderAmount(((clamped * p) / leverage).toFixed(2));
              }
            }}
            className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 no-spinner"
            readOnly={!isHost}
          />
          <span className="text-muted-foreground text-xs">{symbol}</span>
        </div>
      </div>

      {/* No explicit amount input for market in original UI; it is derived */}
    </div>
  );
}
