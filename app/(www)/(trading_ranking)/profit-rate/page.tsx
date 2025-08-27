import { Metadata } from "next";
import { ProfitRatePageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Profit Rate | Weetoo",
  description:
    "Explore top traders by profit rate. See portfolio growth and trade activity.",
};

export default function ProfitRatePage() {
  return <ProfitRatePageClient />;
}
