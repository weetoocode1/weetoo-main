import { OverseasFuturesComparison } from "@/components/exchange/overseas-futures-comparison";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overseas Futures Comparison",
  description:
    "Compare international exchanges - fees, features, security, and trading pairs",
};

export default function OverseasFutures() {
  return (
    <div className="container flex flex-col gap-10 mx-auto px-4 sm:px-6 py-4 pb-10">
      <div className="relative w-full min-h-64 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-950/30 dark:to-transparent">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-950/30 dark:to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent dark:via-blue-800"></div>
          <div className="relative px-4 pt-16 md:pt-24 pb-12">
            <div className="container mx-auto space-y-8">
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight py-2 px-2">
                  Overseas Futures Comparison
                </h1>
                <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-400 break-words py-2 px-2">
                  Compare international exchanges - fees, features, security,
                  and trading pairs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OverseasFuturesComparison />
    </div>
  );
}
