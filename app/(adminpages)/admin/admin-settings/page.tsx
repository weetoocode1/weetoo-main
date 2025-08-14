import { AdminSettingsPageClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Settings | Weetoo",
  description: "Admin Settings | Weetoo",
};

export default function AdminSettingsPage() {
  return <AdminSettingsPageClient />;
}
