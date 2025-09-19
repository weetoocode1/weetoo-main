"use client";

import { useTranslations } from "next-intl";
import { SponsoredRanking } from "@/components/rankings/sponsored-ranking";

export function SponserClient() {
  const t = useTranslations("menu");

  return (
    <div className="container flex flex-col mx-auto pt-16 sm:pt-20 pb-6 sm:pb-10 px-4 sm:px-6">
      <div className="relative w-full h-40 sm:h-56 md:h-64 overflow-hidden rounded-lg md:rounded-xl border border-border bg-gradient-to-b from-amber-50/30 to-transparent dark:from-amber-950/30 dark:to-transparent">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 to-transparent dark:from-amber-950/30 dark:to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent dark:via-amber-800"></div>
          <div className="relative px-3 sm:px-4 pt-14 sm:pt-20 md:pt-24 pb-8 sm:pb-10 md:pb-12">
            <div className="container mx-auto max-w-3xl space-y-4 sm:space-y-6 md:space-y-8">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  {t("sponsoredPage")}
                </h1>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 text-balance max-w-4xl mt-1 mx-auto whitespace-pre-line">
                  {t("sponsoredDescPage")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SponsoredRanking />
    </div>
  );
}
