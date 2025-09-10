"use client";

import { MostFollowedRanking } from "@/components/rankings/most-followed-ranking";
import { useTranslations } from "next-intl";

export function MostFollowedClient() {
  const t = useTranslations("menu");

  return (
    <div className="container flex flex-col mx-auto pt-20 pb-10">
      <div className="relative w-full h-64 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-amber-50/30 to-transparent dark:from-amber-950/30 dark:to-transparent">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 to-transparent dark:from-amber-950/30 dark:to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent dark:via-amber-800"></div>
          <div className="relative px-4 pt-24 pb-12">
            <div className="container mx-auto max-w-3xl space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">
                  {t("mostFollowed")}
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400 mt-2 text-lg">
                  {t("mostFollowedDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MostFollowedRanking />
    </div>
  );
}
