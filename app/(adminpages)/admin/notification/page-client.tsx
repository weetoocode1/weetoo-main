"use client";

import { NotificationStats } from "@/components/admin/notification/notification-stats";
import { NotificationTable } from "@/components/admin/notification/notification-table";
import {
  useAllNotifications,
  useNotificationStats,
} from "@/hooks/use-notifications";
import { useTranslations } from "next-intl";

// interface Notification {
//   id: string;
//   audience: "admin" | "user";
//   type: string;
//   title?: string | null;
//   body?: string | null;
//   metadata?: Record<string, unknown> | null;
//   created_at: string;
//   read?: boolean; // Changed from is_read to read
// }

export function AdminNotificationClient() {
  const t = useTranslations("admin.notifications.page");

  // Fetch notifications and stats
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useAllNotifications();
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useNotificationStats();

  if (notificationsError || statsError) {
    const errorMessage =
      notificationsError?.message ||
      statsError?.message ||
      "Unknown error occurred";

    return (
      <div className="p-8 text-center">
        <div className="text-red-500">
          <div className="text-lg font-medium mb-2">{t("error.title")}</div>
          <div className="text-sm mb-4">{errorMessage}</div>
          <div className="mt-4 text-xs text-muted-foreground">
            {t("error.detailsHint")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-muted/20 animate-pulse rounded-none"
            />
          ))}
        </div>
      ) : (
        <NotificationStats
          stats={
            stats || {
              totalCount: 0,
              unreadCount: 0,
              readCount: 0,
              otherCount: 0,
            }
          }
        />
      )}

      {/* Notifications Table */}
      {notificationsLoading ? (
        <div className="space-y-4">
          <div className="h-12 bg-muted/20 animate-pulse rounded-none" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted/20 animate-pulse rounded-none"
              />
            ))}
          </div>
        </div>
      ) : (
        <NotificationTable notifications={notifications} />
      )}
    </div>
  );
}
