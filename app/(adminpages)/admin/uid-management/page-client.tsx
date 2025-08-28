"use client";

import { AdminUidStats } from "@/components/admin/uid-management/admin-uid-stats";
import { AdminUidTable } from "@/components/admin/uid-management/admin-uid-table";

export function UidManagementPageClient() {
  return (
    <div className="flex-1 space-y-4">
      <AdminUidStats />
      <AdminUidTable />
    </div>
  );
}
