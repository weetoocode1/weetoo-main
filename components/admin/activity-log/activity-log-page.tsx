"use client";

import { RewardStats } from "./reward-stats";
import { RewardTable } from "./reward-table";
import { useTranslations } from "next-intl";

export function ActivityLogPage() {
  useTranslations("admin.activityLog");
  return (
    <div className="space-y-6">
      <RewardStats />
      <RewardTable />
    </div>
  );
}
