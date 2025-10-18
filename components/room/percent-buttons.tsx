"use client";

import { Button } from "@/components/ui/button";
import { useOrderFormStore } from "@/lib/store/order-form-store";

type Props = {
  isHost: boolean;
  isSettingsLoading: boolean;
  safeVirtualBalance: number;
  currentPrice?: number;
  orderPrice: string;
  leverage: number;
  qtyStep: number;
  minQty: number;
  maxQty: number;
  setOrderAmount: (v: string) => void;
  setOrderQuantity: (v: string) => void;
  setOrderPrice: (v: string) => void;
};

const roundToStep = (value: number, step: number) =>
  step > 0 ? Math.round(value / step) * step : value;
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export default function PercentButtons(props: Props) {
  const {
    isHost,
    isSettingsLoading,
    safeVirtualBalance,
    currentPrice,
    orderPrice,
    leverage,
    qtyStep,
    minQty,
    maxQty,
    setOrderAmount,
    setOrderQuantity,
    setOrderPrice,
  } = props;
  const { orderType } = useOrderFormStore();

  const handlePercentClick = (percent: number) => {
    const availableBalance = Math.max(0, safeVirtualBalance);
    const p =
      orderType === "market"
        ? Number(currentPrice) || 0
        : Number(orderPrice) || 0;
    if (!p || !leverage) return;
    const amount = ((availableBalance * percent) / 100).toFixed(2);
    setOrderAmount(amount);
    const quantity = (Number(amount) * leverage) / p;
    const qtyRounded = roundToStep(quantity, qtyStep);
    const qtyClamped = clamp(qtyRounded, minQty, maxQty);
    setOrderQuantity(qtyClamped.toFixed(6));
    if (orderType === "limit") {
      setOrderPrice(p.toFixed(2));
    }
  };

  return (
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
  );
}
