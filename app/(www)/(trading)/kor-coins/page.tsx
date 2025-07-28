import type { Metadata } from "next";

import { KorCoinsRanking } from "@/components/trading/kor-coins-ranking";

export const metadata: Metadata = {
  title: "Kor-Coins Rankings | Weetoo",
  description:
    "View top Kor-Coins holders and their virtual currency balances on Weetoo trading platform.",
};

export default function KorCoinsPage() {
  return (
    <div className="container mx-auto px-4 py-6 pb-12">
      {/* Banner */}
      <div className="relative w-full h-64 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-cyan-50/30 to-transparent dark:from-cyan-950/30 dark:to-transparent mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-50/30 to-transparent dark:from-cyan-950/30 dark:to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent dark:via-cyan-800"></div>
          <div className="relative px-4 pt-24 pb-12">
            <div className="container mx-auto max-w-3xl space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">
                  Kor-Coins Rankings
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Top virtual currency holders on the platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KorCoinsRanking />
    </div>
  );
}
