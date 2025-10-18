"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

type Props = {
  isHost: boolean;
  symbol: string;
  orderPrice: string;
  setOrderPrice: (v: string) => void;
  orderQuantity: string;
  setOrderQuantity: (v: string) => void;
  orderAmount: string;
  setOrderAmount: (v: string) => void;
  currentPrice?: number;
  leverage: number;
  qtyStep: number;
  minQty: number;
  maxQty: number;
  priceTick: number;
  hasEnoughBalance: boolean;
  roundToStep: (v: number, s: number) => number;
  clamp: (v: number, min: number, max: number) => number;
};

export default function OrderFormLimit(props: Props) {
  const t = useTranslations("room.tradingForm");
  const {
    isHost,
    symbol,
    orderPrice,
    setOrderPrice,
    orderQuantity,
    setOrderQuantity,
    orderAmount,
    setOrderAmount,
    currentPrice,
    leverage,
    qtyStep,
    minQty,
    maxQty,
    hasEnoughBalance,
    roundToStep,
    clamp,
  } = props;

  return (
    <div className="flex flex-col gap-3 mb-3">
      <div>
        <Label className="block text-muted-foreground mb-1 text-xs">
          {t("inputs.orderPrice", { quote: "USDT" })}
        </Label>
        <div className="flex items-center bg-secondary border border-border rounded-md px-3 py-1.5 relative">
          <Input
            type="number"
            value={orderPrice}
            onChange={(e) => setOrderPrice(e.target.value)}
            readOnly={!isHost}
            className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 pr-16 no-spinner"
          />
          <span className="text-muted-foreground text-xs">USDT</span>
          {currentPrice && (
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
            onChange={(e) => {
              const value = e.target.value;
              const price = Number(orderPrice) || 0;
              const num = Number(value);
              props.setOrderQuantity(value);
              if (!price || !leverage || !Number.isFinite(num)) {
                props.setOrderAmount("");
                return;
              }
              props.setOrderAmount(((num * price) / leverage).toFixed(2));
            }}
            onBlur={() => {
              const num = Number(orderQuantity);
              if (!Number.isFinite(num)) {
                props.setOrderQuantity("");
                return;
              }
              const rounded = roundToStep(num, qtyStep);
              const clamped = clamp(rounded, minQty, maxQty);
              props.setOrderQuantity(clamped ? clamped.toFixed(6) : "");
              const price = Number(orderPrice) || 0;
              if (price && leverage) {
                props.setOrderAmount(((clamped * price) / leverage).toFixed(2));
              }
            }}
            className="w-full bg-transparent border-0 p-0 h-6 text-xs focus-visible:ring-0 no-spinner"
            readOnly={!isHost}
          />
          <span className="text-muted-foreground text-xs">{symbol}</span>
        </div>
      </div>

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
              const price = Number(orderPrice) || 0;
              if (!price || !leverage) {
                setOrderQuantity("");
                return;
              }
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
      </div>
    </div>
  );
}
