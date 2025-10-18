"use client";

import { useTranslations } from "next-intl";
import { useOrderFormStore } from "@/lib/store/order-form-store";

export default function OrderTypeTabs() {
  const t = useTranslations("room.tradingForm");
  const { orderType, setOrderType } = useOrderFormStore();
  return (
    <div className="flex border-b border-border mb-3">
      <button
        className={`px-4 py-2 text-xs font-medium cursor-pointer ${
          orderType === "limit"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        }`}
        onClick={() => setOrderType("limit")}
      >
        {t("tabs.limit")}
      </button>
      <button
        className={`px-4 py-2 text-xs font-medium cursor-pointer ${
          orderType === "market"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        }`}
        onClick={() => setOrderType("market")}
      >
        {t("tabs.market")}
      </button>
    </div>
  );
}
