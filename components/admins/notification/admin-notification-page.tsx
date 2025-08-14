"use client";

import { useState } from "react";
import { NotificationStats } from "./notification-stats";
import { NotificationTable } from "./notification-table";
import { NotificationDetailsDialog } from "./notification-details-dialog";

interface Notification {
  id: string;
  audience: "admin" | "user";
  type: string;
  title?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  read?: boolean;
}

export function AdminNotificationPage() {
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const notifications: Notification[] = [
    {
      id: "1",
      audience: "admin",
      type: "withdrawal_request",
      title: "New withdrawal request",
      body: "John Doe submitted withdrawal for 5,000 KOR coins",
      metadata: { user: "John Doe", amount: 5000, currency: "KOR" },
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: false,
    },
    {
      id: "2",
      audience: "admin",
      type: "verification_needed",
      title: "Account verification needed",
      body: "Jane Smith's bank account needs verification",
      metadata: { user: "Jane Smith", verificationType: "bank" },
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: false,
    },
    {
      id: "3",
      audience: "admin",
      type: "withdrawal_completed",
      title: "Withdrawal completed",
      body: "Mike Wilson's withdrawal processed successfully",
      metadata: { user: "Mike Wilson", amount: 3000, currency: "KOR" },
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      read: true,
    },
    {
      id: "4",
      audience: "admin",
      type: "verification_failed",
      title: "Verification failed",
      body: "Sarah Johnson's verification failed",
      metadata: { user: "Sarah Johnson", reason: "Invalid documents" },
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      read: true,
    },
    {
      id: "5",
      audience: "admin",
      type: "user_registration",
      title: "New user registration",
      body: "Alex Thompson joined the platform",
      metadata: {
        user: "Alex Thompson",
        registrationDate: new Date().toISOString(),
      },
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      read: true,
    },
    {
      id: "6",
      audience: "admin",
      type: "competition_winner",
      title: "Competition winner",
      body: "Emma Davis won the monthly trading competition",
      metadata: {
        user: "Emma Davis",
        competition: "Monthly Trading",
        prize: "1000 KOR",
      },
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
      read: false,
    },
  ];

  const stats = {
    totalCount: notifications.length,
    unreadCount: notifications.filter((n) => !n.read).length,
    readCount: notifications.filter((n) => n.read).length,
    otherCount: notifications.filter(
      (n) => !n.type.includes("withdrawal") && !n.type.includes("verification")
    ).length,
    withdrawalCount: notifications.filter((n) => n.type.includes("withdrawal"))
      .length,
    verificationCount: notifications.filter((n) =>
      n.type.includes("verification")
    ).length,
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setOpenDialog(true);
  };

  return (
    <div className="space-y-6">
      <NotificationStats stats={stats} />
      <NotificationTable
        notifications={notifications}
        onViewDetails={handleViewDetails}
      />

      <NotificationDetailsDialog
        notification={selectedNotification}
        open={openDialog}
        onOpenChange={setOpenDialog}
      />
    </div>
  );
}
