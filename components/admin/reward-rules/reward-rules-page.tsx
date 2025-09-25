"use client";

import { useAuth } from "@/hooks/use-auth";
import { RewardRulesTable } from "./reward-rules-table";
import { RewardStats } from "./reward-stats";
import { useTranslations } from "next-intl";

export function RewardRulesPage() {
  const { computed } = useAuth();
  const canEdit = computed?.role === "super_admin";
  const t = useTranslations("admin.rewardRules.page");

  return (
    <div className="space-y-6">
      <RewardStats />

      {!canEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            <strong>{t("readOnly.title")}</strong> {t("readOnly.description")}
          </p>
        </div>
      )}

      <RewardRulesTable />
    </div>
  );
}
