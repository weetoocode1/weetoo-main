"use client";

import CryptoDashboardClient from "@/components/comprehensive-data/CryptoDashboardClient";
import RelativePerformanceChartClient from "@/components/comprehensive-data/RelativePerformanceChartClient";

export function ComprehensiveDataClient() {
  return (
    <div className="container flex flex-col gap-10 mx-auto py-4 pb-10 px-4 pt-20">
      <CryptoDashboardClient />
      <RelativePerformanceChartClient />
    </div>
  );
}
