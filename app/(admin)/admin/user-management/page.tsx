import { AdminUserTable } from "@/components/admin/user-management/admin-user-table";
import { UserStats } from "@/components/admin/user-management/user-stats";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin User Management | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function UserManagement() {
  return (
    <div className="font-sans h-full flex flex-col gap-5 container mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-border mt-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, view statistics, and control user access across the
            platform.
          </p>
        </div>
      </div>

      <UserStats />
      <AdminUserTable />
    </div>
  );
}
