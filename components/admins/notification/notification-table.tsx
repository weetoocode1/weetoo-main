"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarkNotificationAsRead } from "@/hooks/use-notifications";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

interface NotificationTableProps {
  notifications: Notification[];
  onViewDetails: (notification: Notification) => void;
}

export function NotificationTable({
  notifications,
  onViewDetails,
}: NotificationTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const markAsReadMutation = useMarkNotificationAsRead();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getNotificationCategory = (type: string) => {
    if (type.includes("withdrawal")) return "withdrawal";
    if (type.includes("verification") || type.includes("bank"))
      return "verification";
    if (type.includes("user")) return "user";
    if (type.includes("trading")) return "trading";
    if (type.includes("system")) return "system";
    return "other";
  };

  const getNotificationType = (type: string) => {
    if (type.includes("created") || type.includes("success")) return "success";
    if (type.includes("failed") || type.includes("error")) return "error";
    if (type.includes("pending") || type.includes("verification"))
      return "warning";
    return "info";
  };

  const getNotificationTitle = (notification: Notification) => {
    if (notification.title) return notification.title;

    // Generate title from type if none exists
    switch (notification.type) {
      case "withdrawal_request_created":
        return "New Withdrawal Request";
      case "bank_account_verified":
        return "Bank Account Verified";
      case "withdrawal_status_updated":
        return "Withdrawal Status Updated";
      default:
        return notification.type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    if (notification.body) return notification.body;

    // Generate message from metadata if no body
    if (
      notification.metadata?.user_name &&
      notification.metadata?.kor_coins_amount
    ) {
      return `${
        notification.metadata.user_name
      } requested ${notification.metadata.kor_coins_amount.toLocaleString()} KOR`;
    }

    if (notification.metadata?.user_name) {
      return `Action by ${notification.metadata.user_name}`;
    }

    return "No additional details available";
  };

  const filteredNotifications = notifications.filter((notification) => {
    const title = getNotificationTitle(notification);
    const message = getNotificationMessage(notification);

    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.type.toLowerCase().includes(searchTerm.toLowerCase());

    const category = getNotificationCategory(notification.type);
    const matchesCategory =
      categoryFilter === "all" || category === categoryFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "read" && notification.read) ||
      (statusFilter === "unread" && !notification.read);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredNotifications.slice(
    startIndex,
    endIndex
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (searchTerm) {
          setSearchTerm("");
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search notifications... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64 shadow-none rounded-none h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 shadow-none rounded-none h-10">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="verification">Verification</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="trading">Trading</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 shadow-none rounded-none h-10">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        <div className="border border-border rounded-none">
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Notification
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentNotifications.map((notification) => {
                    const notificationType = getNotificationType(
                      notification.type
                    );
                    const notificationCategory = getNotificationCategory(
                      notification.type
                    );
                    const notificationTitle =
                      getNotificationTitle(notification);
                    const notificationMessage =
                      getNotificationMessage(notification);

                    return (
                      <tr
                        key={notification.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                              <span className="text-sm">
                                {notificationType === "info" && "ℹ️"}
                                {notificationType === "warning" && "⚠️"}
                                {notificationType === "success" && "✅"}
                                {notificationType === "error" && "❌"}
                              </span>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium text-sm truncate">
                                {notificationTitle}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {notificationMessage}
                              </span>
                              {(notification.metadata?.user_name as string) && (
                                <span className="text-xs text-muted-foreground">
                                  by{" "}
                                  {(notification.metadata
                                    ?.user_name as string) || "Unknown"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                                notificationType === "info"
                                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                                  : notificationType === "warning"
                                  ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                  : notificationType === "success"
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {notificationType.charAt(0).toUpperCase() +
                                notificationType.slice(1)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
                              {notificationCategory.charAt(0).toUpperCase() +
                                notificationCategory.slice(1)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                notification.read
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }`}
                            />
                            <span
                              className={`text-sm ${
                                notification.read
                                  ? "text-green-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {notification.read ? "Read" : "Unread"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-none"
                              >
                                <DropdownMenuLabel>
                                  Notification Actions
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    onViewDetails(notification);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {!notification.read && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleMarkAsRead(notification.id)
                                    }
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Mark as Read
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {/* Quick Mark as Read button */}
                            {!notification.read && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleMarkAsRead(notification.id)
                                }
                                className="h-8 px-2 text-xs"
                                disabled={markAsReadMutation.isPending}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark Read
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:hidden">
            <div className="space-y-4 p-4">
              {currentNotifications.map((notification) => {
                const notificationType = getNotificationType(notification.type);
                const notificationCategory = getNotificationCategory(
                  notification.type
                );
                const notificationTitle = getNotificationTitle(notification);
                const notificationMessage =
                  getNotificationMessage(notification);

                return (
                  <div
                    key={notification.id}
                    className="border border-border/30 rounded-none p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                          <span className="text-base">
                            {notificationType === "info" && "ℹ️"}
                            {notificationType === "warning" && "⚠️"}
                            {notificationType === "success" && "✅"}
                            {notificationType === "error" && "❌"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {notificationTitle}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(notification.metadata?.user_name as string) ||
                              "Unknown"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>
                              Notification Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                onViewDetails(notification);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {!notification.read && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMarkAsRead(notification.id)
                                }
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Mark as Read
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                            notificationType === "info"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : notificationType === "warning"
                              ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                              : notificationType === "success"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                          }`}
                        >
                          {notificationType.charAt(0).toUpperCase() +
                            notificationType.slice(1)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            notification.read ? "bg-green-500" : "bg-yellow-500"
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            notification.read
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {notification.read ? "Read" : "Unread"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
                          {notificationCategory.charAt(0).toUpperCase() +
                            notificationCategory.slice(1)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">
                          {notificationMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {filteredNotifications.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium mb-2">
                  No notifications found
                </div>
                <div className="text-sm">
                  Try adjusting your search criteria
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-
            {Math.min(endIndex, filteredNotifications.length)} of{" "}
            {filteredNotifications.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                if (
                  totalPages <= 5 ||
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
