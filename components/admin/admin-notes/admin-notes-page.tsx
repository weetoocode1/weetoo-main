"use client";

import { AdminNotesTable } from "./admin-notes-table";
import { AdminNotesStats } from "./admin-notes-stats";

export function AdminNotesPage() {
  return (
    <div className="space-y-4">
      <AdminNotesStats />
      <AdminNotesTable />
    </div>
  );
}
