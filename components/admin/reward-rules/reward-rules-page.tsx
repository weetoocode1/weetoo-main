"use client";

import { useAuth } from "@/hooks/use-auth";
import { RewardRulesTable } from "./reward-rules-table";
import { RewardStats } from "./reward-stats";

export function RewardRulesPage() {
  const { computed } = useAuth();
  const canEdit = computed?.role === "super_admin";

  return (
    <div className="space-y-6">
      <RewardStats />

      {!canEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            <strong>Read-only access:</strong> You can view reward rules but
            cannot edit them. Only super administrators can modify reward
            settings.
          </p>
        </div>
      )}

      <RewardRulesTable />
    </div>
  );
}
