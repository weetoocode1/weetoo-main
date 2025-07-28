import { LiveKitManagementPage } from "@/components/admin/livekt-management/livekit-management-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Livekit Management | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function LivekitManagement() {
  return <LiveKitManagementPage />;
}
