import { Metadata } from "next";
import { AdminSettingsPage } from "@/components/admin/admin-settings/admin-settings-page";

export const metadata: Metadata = {
  title: "Admin Settings | Weetoo",
  description:
    "Manage your admin settings here. Configure site-wide options, manage users, and set permissions.",
};

export default function AdminSettings() {
  return <AdminSettingsPage />;
}
