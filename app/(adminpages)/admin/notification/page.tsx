import { Metadata } from "next";
import { AdminNotificationClient } from "./page-client";

export const metadata: Metadata = {
  title: "Notification | Weetoo",
  description: "Notification | Weetoo",
};

export default function NotificationPage() {
  return <AdminNotificationClient />;
}
