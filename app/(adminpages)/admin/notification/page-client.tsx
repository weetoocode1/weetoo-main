"use client";

import { useState } from "react";
import { NotificationStats } from "@/components/admins/notification/notification-stats";
import { NotificationTable } from "@/components/admins/notification/notification-table";
import {
  useAllNotifications,
  useNotificationStats,
} from "@/hooks/use-notifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Notification {
  id: string;
  audience: "admin" | "user";
  type: string;
  title?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  read?: boolean; // Changed from is_read to read
}

export function AdminNotificationClient() {
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailsOpen(true);
  };

  if (notificationsError || statsError) {
    const errorMessage =
      notificationsError?.message ||
      statsError?.message ||
      "Unknown error occurred";

    return (
      <div className="p-8 text-center">
        <div className="text-red-500">
          <div className="text-lg font-medium mb-2">
            Error loading notifications
          </div>
          <div className="text-sm mb-4">{errorMessage}</div>
          <div className="mt-4 text-xs text-muted-foreground">
            Check browser console for more details
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <NotificationTable
          notifications={notifications}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Notification Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">ID:</span>
                  <p className="text-muted-foreground font-mono text-xs break-all">
                    {selectedNotification.id}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="text-muted-foreground">
                    {selectedNotification.type}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Audience:</span>
                  <p className="text-muted-foreground capitalize">
                    {selectedNotification.audience}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <p className="text-muted-foreground">
                    {selectedNotification.read ? "Read" : "Unread"}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <p className="text-muted-foreground">
                    {new Date(selectedNotification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedNotification.title && (
                <div>
                  <span className="font-medium">Title:</span>
                  <p className="text-muted-foreground">
                    {selectedNotification.title}
                  </p>
                </div>
              )}

              {selectedNotification.body && (
                <div>
                  <span className="font-medium">Body:</span>
                  <p className="text-muted-foreground">
                    {selectedNotification.body}
                  </p>
                </div>
              )}

              {selectedNotification.metadata &&
                Object.keys(selectedNotification.metadata).length > 0 && (
                  <div>
                    <span className="font-medium">Metadata:</span>
                    <pre className="text-muted-foreground text-xs bg-muted/20 p-2 rounded overflow-auto">
                      {JSON.stringify(selectedNotification.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
