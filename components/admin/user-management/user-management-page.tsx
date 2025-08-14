"use client";

import { UserManagementTable } from "./user-management-table";
import { UserStats } from "./user-stats";

export function UserManagementPage() {
  return (
    <div className="space-y-3">
      <UserStats />
      <UserManagementTable />
    </div>
  );
}
