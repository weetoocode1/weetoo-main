"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
} from "lucide-react";

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

interface NotificationDetailsDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDetailsDialog({
  notification,
  open,
  onOpenChange,
}: NotificationDetailsDialogProps) {
  if (!notification) return null;

  const getTypeIcon = (type: string) => {
    if (type.includes("success") || type.includes("completed")) {
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    } else if (type.includes("failed") || type.includes("error")) {
      return <XCircle className="h-6 w-6 text-red-600" />;
    } else if (type.includes("warning") || type.includes("needed")) {
      return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
    } else {
      return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    if (type.includes("success") || type.includes("completed")) {
      return "bg-green-100 text-green-800 border-green-300";
    } else if (type.includes("failed") || type.includes("error")) {
      return "bg-red-100 text-red-800 border-red-300";
    } else if (type.includes("warning") || type.includes("needed")) {
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    } else {
      return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategory = (type: string) => {
    if (type.includes("withdrawal")) return "withdrawal";
    if (type.includes("verification")) return "verification";
    if (type.includes("user")) return "user";
    if (type.includes("trading")) return "trading";
    if (type.includes("system")) return "system";
    if (type.includes("competition")) return "competition";
    return "other";
  };

  const category = getCategory(notification.type);
  const typeColor = getTypeColor(notification.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Notification Details
          </DialogTitle>
          <DialogDescription>
            Comprehensive information about the notification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-muted/20 border border-border rounded-lg">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-full border-2 border-primary/20">
              {getTypeIcon(notification.type)}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">
                {notification.title}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {notification.id}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 flex items-center justify-center rounded-lg">
                {getTypeIcon(notification.type)}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Type</div>
                <div className="text-sm font-medium">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium border ${typeColor}`}
                  >
                    {notification.type.charAt(0).toUpperCase() +
                      notification.type.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
              <div className="w-8 h-8 bg-purple-100 flex items-center justify-center rounded-lg">
                <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="text-sm font-medium capitalize">{category}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
              <div className="w-8 h-8 bg-green-100 flex items-center justify-center rounded-lg">
                <div
                  className={`w-2 h-2 rounded-full ${
                    notification.read ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div
                  className={`text-sm font-medium ${
                    notification.read ? "text-green-700" : "text-yellow-700"
                  }`}
                >
                  {notification.read ? "Read" : "Unread"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 flex items-center justify-center rounded-lg">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Timestamp</div>
                <div className="text-sm font-medium">
                  {formatTime(notification.created_at)}
                </div>
              </div>
            </div>

            {notification.audience === "user" && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 flex items-center justify-center rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">User</div>
                  <div className="text-sm font-medium">
                    {(notification.metadata?.user as string) || "Unknown"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Message
            </div>
            <div className="p-4 bg-muted/20 border border-border rounded-lg">
              <p className="text-sm leading-relaxed">{notification.body}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
