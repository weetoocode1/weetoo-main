"use client";

import { useTranslations } from "next-intl";

import { TradingRoomsList } from "@/components/trading/trading-rooms-list";

export function TradingPageClient() {
  const t = useTranslations("trading");

  return (
    <div className="container flex flex-col mx-auto pt-16 sm:pt-20 pb-6 sm:pb-10 px-4 sm:px-6">
      <div className="relative w-full h-40 sm:h-56 md:h-64 overflow-hidden rounded-lg md:rounded-xl border border-border bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-950/30 dark:to-transparent mb-3 sm:mb-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-950/30 dark:to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent dark:via-blue-800" />
          <div className="relative px-3 sm:px-4 pt-14 sm:pt-20 md:pt-24 pb-8 sm:pb-10 md:pb-12">
            <div className="container mx-auto max-w-3xl space-y-4 sm:space-y-6 md:space-y-8">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  {t("tradingRooms")}
                </h1>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 text-balance max-w-xl mt-1 mx-auto">
                  {t("tradingRoomsDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TradingRoomsList />
    </div>
  );
}
