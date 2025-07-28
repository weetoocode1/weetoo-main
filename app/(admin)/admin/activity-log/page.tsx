import { ActivityLogMain } from "@/components/admin/activity-log/activity-log-main";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Activity Logs | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function ActivityLog() {
  return (
    <div className="flex flex-col gap-8">
      <ActivityLogMain />
    </div>
  );
}
