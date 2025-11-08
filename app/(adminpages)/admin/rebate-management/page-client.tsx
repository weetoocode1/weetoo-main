"use client";

import { WithdrawalManagementTable } from "@/components/admin/rebate-management/withdrawal-management-table";
import { WithdrawalStats } from "@/components/admin/rebate-management/withdrawal-stats";

export default function RebateManagementClient() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <WithdrawalStats />

      {/* Table */}
      <WithdrawalManagementTable />
    </div>
  );
}
