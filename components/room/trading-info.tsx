"use client";

import { useTranslations } from "next-intl";

type Props = {
  fee: number;
  leverageValue: number;
  positionSize: number;
  initialMargin: number;
  liqPriceLong: number;
  liqPriceShort: number;
};

export default function TradingInfo(props: Props) {
  const t = useTranslations("room.tradingForm");
  const {
    fee,
    leverageValue,
    positionSize,
    initialMargin,
    liqPriceLong,
    liqPriceShort,
  } = props;
  return (
    <div className="flex flex-col gap-1.5 mb-3 text-xs">
      <div className="flex justify-between text-muted-foreground">
        <span>{t("info.fee")}</span>
        <span>{fee.toFixed(2)} USDT</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{t("info.leverage")}</span>
        <span>{leverageValue.toFixed(2)}x</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{t("info.positionSize", { quote: "USDT" })}</span>
        <span>{positionSize.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{t("info.initialMargin", { quote: "USDT" })}</span>
        <span>{initialMargin.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{t("info.estLiqLong")}</span>
        <span className="text-red-500">
          {liqPriceLong > 0 ? liqPriceLong.toFixed(2) : "-"}
        </span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{t("info.estLiqShort")}</span>
        <span className="text-green-500">
          {liqPriceShort > 0 ? liqPriceShort.toFixed(2) : "-"}
        </span>
      </div>
    </div>
  );
}
