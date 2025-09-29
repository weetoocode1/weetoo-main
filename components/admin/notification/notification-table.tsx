"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTranslations } from "next-intl";

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
}

// Notification configuration - easily extensible for future categories
const NOTIFICATION_CONFIG = {
  withdrawal_request_created: {
    category: "withdrawal",
    type: "success",
    icon: "💰",
    color: "bg-green-100 text-green-800 border-green-300",
  },
  deposit_request_created: {
    category: "deposit",
    type: "success",
    icon: "💳",
    color: "bg-green-100 text-green-800 border-green-300",
  },
  withdrawal_status_updated: {
    category: "withdrawal",
    type: "info",
    icon: "ℹ️",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  deposit_status_updated: {
    category: "deposit",
    type: "info",
    icon: "ℹ️",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
} as const;

export function NotificationTable({ notifications }: NotificationTableProps) {
  const t = useTranslations("admin.notifications.table");
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // Limit to only withdrawal and deposit notification types
  const ALLOWED_TYPES = new Set(
    Object.keys(NOTIFICATION_CONFIG) as Array<keyof typeof NOTIFICATION_CONFIG>
  );
  const baseNotifications = notifications.filter((n) =>
    ALLOWED_TYPES.has(n.type as keyof typeof NOTIFICATION_CONFIG)
  );
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

    if (diff < 60) return t("relativeTime.minutes", { value: diff });
    if (diff < 1440)
      return t("relativeTime.hours", { value: Math.floor(diff / 60) });
    return t("relativeTime.days", { value: Math.floor(diff / 1440) });
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailsOpen(true);
  };

  // Get notification configuration - fallback to defaults if not found
  const getNotificationConfig = (type: string) => {
    const config =
      NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG];
    if (config) {
      return {
        ...config,
        title: t(`notificationTypes.${type}`),
      };
    }
    return {
      title: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      category: "other",
      type: "info",
      icon: "ℹ️",
      color: "bg-gray-100 text-gray-800 border-gray-300",
    };
  };

  const getNotificationTitle = (notification: Notification) => {
    return getNotificationConfig(notification.type).title;
  };

  const getNotificationMessage = (notification: Notification) => {
    if (notification.body) return notification.body;

    // Generate message from metadata if no body
    if (
      notification.metadata?.user_name &&
      notification.metadata?.kor_coins_amount
    ) {
      return t("generated.requestKor", {
        user: notification.metadata.user_name as string,
        amount: (
          notification.metadata.kor_coins_amount as number
        ).toLocaleString(),
      });
    }

    if (notification.metadata?.user_name) {
      return t("generated.actionBy", {
        user: notification.metadata.user_name as string,
      });
    }

    return t("generated.noDetails");
  };

  // Get unique categories for filter dropdown
  const getAvailableCategories = () => {
    const categories = new Set(
      baseNotifications.map((n) => getNotificationConfig(n.type).category)
    );
    return Array.from(categories).sort();
  };

  const filteredNotifications = baseNotifications.filter((notification) => {
    const config = getNotificationConfig(notification.type);
    const title = getNotificationTitle(notification);
    const message = getNotificationMessage(notification);

    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || config.category === categoryFilter;

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
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64 shadow-none rounded-none h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 shadow-none rounded-none h-10">
              <SelectValue placeholder={t("filters.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
              {getAvailableCategories().map((category) => (
                <SelectItem key={category} value={category}>
                  {t(`filters.${category}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 shadow-none rounded-none h-10">
              <SelectValue placeholder={t("filters.allStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allStatus")}</SelectItem>
              <SelectItem value="read">{t("filters.read")}</SelectItem>
              <SelectItem value="unread">{t("filters.unread")}</SelectItem>
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
                      {t("columns.notification")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.type")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.category")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.status")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.time")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentNotifications.map((notification) => {
                    const config = getNotificationConfig(notification.type);
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
                              <span className="text-sm">{config.icon}</span>
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
                                  {t("by")}{" "}
                                  {(notification.metadata
                                    ?.user_name as string) || t("unknown")}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${config.color}`}
                            >
                              {t(`typeValues.${config.type}`)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
                              {t(`categoryValues.${config.category}`)}
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
                              {notification.read
                                ? t("status.read")
                                : t("status.unread")}
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
                                  <span className="sr-only">
                                    {t("menu.open")}
                                  </span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-none"
                              >
                                <DropdownMenuLabel>
                                  {t("menu.title")}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    handleViewDetails(notification);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("menu.viewDetails")}
                                </DropdownMenuItem>
                                {!notification.read && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleMarkAsRead(notification.id)
                                    }
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    {t("menu.markAsRead")}
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
                                {t("menu.markReadShort")}
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
                const config = getNotificationConfig(notification.type);
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
                          <span className="text-base">{config.icon}</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {notificationTitle}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(notification.metadata?.user_name as string) ||
                              t("unknown")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{t("menu.open")}</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>
                              {t("menu.title")}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                handleViewDetails(notification);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("menu.viewDetails")}
                            </DropdownMenuItem>
                            {!notification.read && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMarkAsRead(notification.id)
                                }
                              >
                                <Check className="mr-2 h-4 w-4" />
                                {t("menu.markAsRead")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${config.color}`}
                        >
                          {t(`typeValues.${config.type}`)}
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
                          {notification.read
                            ? t("status.read")
                            : t("status.unread")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
                          {t(`categoryValues.${config.category}`)}
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
                  {t("empty.title")}
                </div>
                <div className="text-sm">{t("empty.subtitle")}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              start: startIndex + 1,
              end: Math.min(endIndex, filteredNotifications.length),
              total: filteredNotifications.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("pagination.previous")}
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
              {t("pagination.next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Notification Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="!max-w-4xl rounded-none">
          <DialogHeader className="border-b border-border pb-6">
            <DialogTitle className="text-xl font-bold text-primary">
              {t("details.title")}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-2">
              {/* Main Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-none border border-border">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                      {t("details.basicInfo")}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.type")}:
                        </span>
                        <p className="text-sm mt-1">
                          {
                            getNotificationConfig(selectedNotification.type)
                              .title
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.category")}:
                        </span>
                        <p className="text-sm mt-1">
                          {t(
                            `categoryValues.${
                              getNotificationConfig(selectedNotification.type)
                                .category
                            }`
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.status")}:
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              selectedNotification.read
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              selectedNotification.read
                                ? "text-green-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {selectedNotification.read
                              ? t("status.read")
                              : t("status.unread")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-none border border-border">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                      {t("details.timingInfo")}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.created")}:
                        </span>
                        <p className="text-sm mt-1">
                          {new Date(
                            selectedNotification.created_at
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.audience")}:
                        </span>
                        <p className="text-sm mt-1 capitalize">
                          {selectedNotification.audience}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.id")}:
                        </span>
                        <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                          {selectedNotification.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Content */}
              {(selectedNotification.title || selectedNotification.body) && (
                <div className="bg-muted/30 p-4 rounded-none border border-border">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
                    {t("details.content")}
                  </h3>
                  <div className="space-y-4">
                    {selectedNotification.title && (
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.titleLabel")}:
                        </span>
                        <p className="text-sm mt-1 font-medium">
                          {selectedNotification.title}
                        </p>
                      </div>
                    )}
                    {selectedNotification.body && (
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.body")}:
                        </span>
                        <p className="text-sm mt-1 leading-relaxed">
                          {selectedNotification.body}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              {selectedNotification.metadata && (
                <div className="bg-muted/30 p-4 rounded-none border border-border">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
                    {t("details.transactionInfo")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedNotification.metadata?.user_name ? (
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.user")}:
                        </span>
                        <p className="text-sm mt-1 font-medium">
                          {String(selectedNotification.metadata.user_name)}
                        </p>
                      </div>
                    ) : null}
                    {selectedNotification.metadata?.kor_coins_amount ? (
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.amount")}:
                        </span>
                        <p className="text-sm mt-1 font-bold text-primary">
                          {Number(
                            selectedNotification.metadata.kor_coins_amount
                          ).toLocaleString()}{" "}
                          KOR
                        </p>
                      </div>
                    ) : null}
                    {selectedNotification.metadata?.status ? (
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.transactionStatus")}:
                        </span>
                        <p className="text-sm mt-1">
                          {String(selectedNotification.metadata.status)}
                        </p>
                      </div>
                    ) : null}
                    {selectedNotification.metadata?.method ? (
                      <div>
                        <span className="font-medium text-sm">
                          {t("details.method")}:
                        </span>
                        <p className="text-sm mt-1">
                          {String(selectedNotification.metadata.method)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
