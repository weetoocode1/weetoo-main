import { ActivityPointsPage } from "@/components/admin/activity-points/activity-points-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Activity Points | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function ActivityPoints() {
  return <ActivityPointsPage />;
}
