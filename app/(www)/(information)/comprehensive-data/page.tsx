import CryptoDashboardClient from "@/components/comprehensive-data/CryptoDashboardClient";
import { Metadata } from "next";
import RelativePerformanceChartClient from "@/components/comprehensive-data/RelativePerformanceChartClient";

export const metadata: Metadata = {
  title: "Comprehensive Data - Market Insights and Analytics",
  description:
    "Access real-time market data, charts, analytics, and trading indicators",
};

export default function ComprehensiveData() {
  return (
    <div className="container flex flex-col gap-10 mx-auto py-4 pb-10 px-4">
      <CryptoDashboardClient />
      <RelativePerformanceChartClient />
    </div>
  );
}
