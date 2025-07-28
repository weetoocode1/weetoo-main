"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Calendar,
  FileText,
  Gift,
  MessageSquare,
  Share2,
  ThumbsUp,
} from "lucide-react";
import type { ActivityPoints } from "./activity-points-table";

interface ActivityPointsDetailsDialogProps {
  activity: ActivityPoints;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityPointsDetailsDialog({
  activity,
  open,
  onOpenChange,
}: ActivityPointsDetailsDialogProps) {
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Get activity type badge color
  const getActivityTypeBadgeClass = (activityType: string) => {
    switch (activityType) {
      case "post_create":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/20";
      case "comment_add":
        return "bg-green-50 text-green-700 dark:bg-green-900/20";
      case "post_like":
        return "bg-pink-50 text-pink-700 dark:bg-pink-900/20";
      case "post_share":
        return "bg-purple-50 text-purple-700 dark:bg-purple-900/20";
      case "welcome_bonus":
      case "daily_login":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-900/20";
    }
  };

  // Get activity type label
  const getActivityTypeLabel = (activityType: string) => {
    switch (activityType) {
      case "post_create":
        return "Post Creation";
      case "comment_add":
        return "Comment";
      case "post_like":
        return "Like";
      case "post_share":
        return "Share";
      case "welcome_bonus":
        return "Welcome Bonus";
      case "daily_login":
        return "Daily Login Bonus";
      default:
        return activityType;
    }
  };

  // Get activity type icon
  const getActivityTypeIcon = (activityType: string) => {
    switch (activityType) {
      case "post_create":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "comment_add":
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case "post_like":
        return <ThumbsUp className="h-5 w-5 text-pink-500" />;
      case "post_share":
        return <Share2 className="h-5 w-5 text-purple-500" />;
      case "welcome_bonus":
      case "daily_login":
        return <Gift className="h-5 w-5 text-yellow-500" />;
      default:
        return <Award className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get content description from metadata
  const getContentDescription = (activity: ActivityPoints) => {
    const metadata = activity.metadata || {};

    switch (activity.transaction_type) {
      case "post_create":
        return `Created a post: ${metadata.post_title || "Untitled Post"}`;
      case "comment_add":
        return `Commented on: ${metadata.post_title || "Unknown Post"}`;
      case "post_like":
        return `Liked a post: ${metadata.post_title || "Unknown Post"}`;
      case "post_share":
        return `Shared a post: ${metadata.post_title || "Unknown Post"}${
          metadata.share_platform ? ` on ${metadata.share_platform}` : ""
        }`;
      case "welcome_bonus":
        return "Received welcome bonus";
      case "daily_login":
        return "Received daily login bonus";
      default:
        return "Performed an activity";
    }
  };

  const userName = `${activity.user.first_name} ${activity.user.last_name}`;
  const activityTypeLabel = getActivityTypeLabel(activity.transaction_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="sticky top-0 z-10 pb-4 border-b">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
            Activity Points Details
            <Badge
              variant="outline"
              className={getActivityTypeBadgeClass(activity.transaction_type)}
            >
              {activityTypeLabel}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Activity ID: <span className="font-mono">{activity.act_id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* User Information */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={activity.user.avatar_url || ""}
                alt={userName}
              />
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{userName}</h3>
              <p className="text-sm text-muted-foreground font-mono">
                {activity.user.uid}
              </p>
            </div>
          </div>

          <Separator />

          {/* Activity Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Award className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Points Earned</p>
                <p className="text-lg font-semibold">
                  {activity.exp_earned} EXP
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.coins_earned} KOR Coins
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Date & Time</p>
                <p>{formatDate(activity.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              {getActivityTypeIcon(activity.transaction_type)}
              <div>
                <p className="text-sm font-medium">Activity Type</p>
                <p>{activityTypeLabel}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Content</p>
                <p className="text-sm">{getContentDescription(activity)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Transaction Details</h4>
            <div className="bg-muted/50 p-4 rounded-md">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Transaction ID</span>
                <span className="text-sm font-mono break-all">
                  {activity.act_id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Transaction Type</span>
                <span className="text-sm">{activity.transaction_type}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                <span className="text-sm font-medium">Created At</span>
                <span className="text-sm">
                  {formatDate(activity.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 bg-background pt-4 border-t mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="shadow-none h-10 cursor-pointer w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
