"use client";

import { useTranslations } from "next-intl";
import { KorCoinsStats } from "@/components/admin/kor-coins/kor-coins-stats";
import { KorCoinsTable } from "@/components/admin/kor-coins/kor-coins-table";
import { KorCoinsChart } from "@/components/admin/kor-coins/kor-coins-chart";

export function KorCoinsPageClient() {
  useTranslations("admin.korCoins");

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
