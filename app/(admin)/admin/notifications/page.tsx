import { NotificationPage } from "@/components/admin/notification/notification-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Notifications | Weetoo",
  description:
    "Weetoo Admin Dashboard - Manage your account, settings, and notifications",
};

export default function Notifications() {
  return (
    <div className="font-sans h-full scrollbar-none outline-hidden">
      <NotificationPage />
    </div>
  );
}
