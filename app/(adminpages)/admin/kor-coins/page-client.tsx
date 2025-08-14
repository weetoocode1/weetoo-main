"use client";

import { KorCoinsStats } from "@/components/admin/kor-coins/kor-coins-stats";
import { KorCoinsChart } from "@/components/admin/kor-coins/kor-coins-chart";
import { KorCoinsTable } from "@/components/admin/kor-coins/kor-coins-table";

export function KorCoinsPageClient() {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <KorCoinsStats />

      {/* KOR Coins Table */}
      <KorCoinsTable />

      {/* KOR Coins Activity Chart */}
      <KorCoinsChart />
    </div>
  );
}
