import { Metadata } from "next";
import { TradingPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Trading | Weetoo",
  description:
    "Start trading cryptocurrencies, stocks, and forex with Weetoo. Join our platform for a risk-free trading simulation experience.",
};

export default function TradingPage() {
  return <TradingPageClient />;
}
