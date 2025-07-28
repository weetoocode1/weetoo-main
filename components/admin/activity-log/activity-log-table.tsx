"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  UserCog,
  FileEdit,
  ArrowRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock data for the activity log
const activityLogData: Activity[] = [
  {
    id: "act_1",
    adminId: "admin_1",
    adminName: "Sarah Johnson",
    adminAvatar: "",
    action: "post_approval",
    actionLabel: "Post Approval",
    target: "How to optimize your workflow",
    targetId: "post_123",
    timestamp: new Date(2025, 5, 8, 14, 30),
    status: "completed",
    details: {
      previousStatus: "pending",
      newStatus: "approved",
      category: "Productivity",
      authorId: "user_456",
      authorName: "Michael Chen",
    },
  },
  {
    id: "act_2",
    adminId: "admin_2",
    adminName: "David Wilson",
    adminAvatar: "",
    action: "user_update",
    actionLabel: "User Update",
    target: "Emma Thompson",
    targetId: "user_789",
    timestamp: new Date(2025, 5, 8, 12, 15),
    status: "completed",
    details: {
      changes: {
        role: {
          from: "user",
          to: "moderator",
        },
        permissions: {
          added: ["delete_comments", "edit_posts"],
          removed: [],
        },
      },
    },
  },
  {
    id: "act_3",
    adminId: "admin_1",
    adminName: "Sarah Johnson",
    adminAvatar: "",
    action: "content_removal",
    actionLabel: "Content Removal",
    target: "Inappropriate comment",
    targetId: "comment_321",
    timestamp: new Date(2025, 5, 8, 10, 45),
    status: "completed",
    details: {
      reason: "Violation of community guidelines",
      reportId: "report_567",
      reportedBy: "user_890",
    },
  },
  {
    id: "act_4",
    adminId: "admin_3",
    adminName: "Alex Rodriguez",
    adminAvatar: "",
    action: "system_settings",
    actionLabel: "System Settings",
    target: "Email notification settings",
    targetId: "settings_email",
    timestamp: new Date(2025, 5, 8, 9, 20),
    status: "completed",
    details: {
      changes: {
        welcomeEmailTemplate: {
          from: "Template A",
          to: "Template B",
        },
        notificationFrequency: {
          from: "immediate",
          to: "daily digest",
        },
      },
    },
  },
  {
    id: "act_5",
    adminId: "admin_2",
    adminName: "David Wilson",
    adminAvatar: "",
    action: "user_ban",
    actionLabel: "User Ban",
    target: "John Smith",
    targetId: "user_111",
    timestamp: new Date(2025, 5, 7, 16, 50),
    status: "completed",
    details: {
      reason: "Multiple violations of terms of service",
      duration: "permanent",
      previousWarnings: 3,
    },
  },
  {
    id: "act_6",
    adminId: "admin_1",
    adminName: "Sarah Johnson",
    adminAvatar: "",
    action: "post_rejection",
    actionLabel: "Post Rejection",
    target: "10 ways to make money online",
    targetId: "post_222",
    timestamp: new Date(2025, 5, 7, 14, 10),
    status: "completed",
    details: {
      reason: "Spam content",
      feedback: "Content appears to be promotional without proper disclosure",
      authorId: "user_333",
    },
  },
  {
    id: "act_7",
    adminId: "admin_3",
    adminName: "Alex Rodriguez",
    adminAvatar: "",
    action: "category_creation",
    actionLabel: "Category Creation",
    target: "Artificial Intelligence",
    targetId: "category_ai",
    timestamp: new Date(2025, 5, 7, 11, 25),
    status: "completed",
    details: {
      parentCategory: "Technology",
      description: "Discussions about AI, machine learning, and related topics",
      visibility: "public",
    },
  },
];

interface PostApprovalDetails {
  previousStatus: string;
  newStatus: string;
  category: string;
  authorId: string;
  authorName: string;
}

interface UserUpdateDetails {
  changes: {
    role: {
      from: string;
      to: string;
    };
    permissions: {
      added: string[];
      removed: string[];
    };
  };
}

interface ContentRemovalDetails {
  reason: string;
  reportId: string;
  reportedBy: string;
}

interface SystemSettingsDetails {
  changes: Record<
    string,
    {
      from: string;
      to: string;
    }
  >;
}

interface UserBanDetails {
  reason: string;
  duration: string;
  previousWarnings: number;
}

interface PostRejectionDetails {
  reason: string;
  feedback: string;
  authorId: string;
}

interface CategoryCreationDetails {
  parentCategory: string;
  description: string;
  visibility: string;
}

type ActivityDetails =
  | PostApprovalDetails
  | UserUpdateDetails
  | ContentRemovalDetails
  | SystemSettingsDetails
  | UserBanDetails
  | PostRejectionDetails
  | CategoryCreationDetails;

interface Activity {
  id: string;
  adminId: string;
  adminName: string;
  adminAvatar: string;
  action: string;
  actionLabel: string;
  target: string;
  targetId: string;
  timestamp: Date;
  status: string;
  details: ActivityDetails;
}

interface ActivityLogTableProps {
  searchQuery: string;
  filters: {
    dateRange: { from: Date | undefined; to: Date | undefined };
    selectedAdmins: string[];
    selectedActions: string[];
  };
}

// Helper function to format dates
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

// Type guards
function isPostApprovalDetails(
  details: ActivityDetails
): details is PostApprovalDetails {
  return "previousStatus" in details && "newStatus" in details;
}

function isUserUpdateDetails(
  details: ActivityDetails
): details is UserUpdateDetails {
  return "changes" in details && "role" in details.changes;
}

function isContentRemovalDetails(
  details: ActivityDetails
): details is ContentRemovalDetails {
  return "reason" in details && "reportId" in details;
}

function isSystemSettingsDetails(
  details: ActivityDetails
): details is SystemSettingsDetails {
  return (
    "changes" in details &&
    typeof details.changes === "object" &&
    !("role" in details.changes) &&
    !("permissions" in details.changes)
  );
}

function isUserBanDetails(details: ActivityDetails): details is UserBanDetails {
  return (
    "reason" in details &&
    "duration" in details &&
    "previousWarnings" in details
  );
}

function isPostRejectionDetails(
  details: ActivityDetails
): details is PostRejectionDetails {
  return "reason" in details && "feedback" in details && "authorId" in details;
}

function isCategoryCreationDetails(
  details: ActivityDetails
): details is CategoryCreationDetails {
  return (
    "parentCategory" in details &&
    "description" in details &&
    "visibility" in details
  );
}

export function ActivityLogTable({
  searchQuery,
  filters,
}: ActivityLogTableProps) {
  const [sortColumn] = useState<string>("timestamp");
  const [sortDirection] = useState<"asc" | "desc">("desc");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filter and search logic
  const filteredData = useMemo(() => {
    let filtered = [...activityLogData];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (activity) =>
          activity.adminName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          activity.actionLabel
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          activity.target.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply admin filter
    if (filters.selectedAdmins.length > 0) {
      filtered = filtered.filter((activity) =>
        filters.selectedAdmins.includes(activity.adminId)
      );
    }

    // Apply action filter
    if (filters.selectedActions.length > 0) {
      filtered = filtered.filter((activity) =>
        filters.selectedActions.includes(activity.action)
      );
    }

    // Apply date range filter
    if (filters.dateRange.from) {
      filtered = filtered.filter((activity) => {
        const activityDate = activity.timestamp;
        const fromDate = filters.dateRange.from!;
        const toDate = filters.dateRange.to || new Date();

        return activityDate >= fromDate && activityDate <= toDate;
      });
    }

    return filtered;
  }, [searchQuery, filters]);

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortColumn === "timestamp") {
      return sortDirection === "asc"
        ? a.timestamp.getTime() - b.timestamp.getTime()
        : b.timestamp.getTime() - a.timestamp.getTime();
    }
    if (sortColumn === "admin") {
      return sortDirection === "asc"
        ? a.adminName.localeCompare(b.adminName)
        : b.adminName.localeCompare(a.adminName);
    }
    if (sortColumn === "action") {
      return sortDirection === "asc"
        ? a.actionLabel.localeCompare(b.actionLabel)
        : b.actionLabel.localeCompare(a.actionLabel);
    }
    return 0;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "post_approval":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "user_update":
        return <UserCog className="h-4 w-4 text-blue-500" />;
      case "content_removal":
        return <FileEdit className="h-4 w-4 text-red-500" />;
      case "system_settings":
        return <FileEdit className="h-4 w-4 text-amber-500" />;
      case "user_ban":
        return <UserCog className="h-4 w-4 text-red-500" />;
      case "post_rejection":
        return <FileEdit className="h-4 w-4 text-orange-500" />;
      case "category_creation":
        return <FileEdit className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "post_approval":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Post Approval
          </Badge>
        );
      case "user_update":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            User Update
          </Badge>
        );
      case "content_removal":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Content Removal
          </Badge>
        );
      case "system_settings":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            System Settings
          </Badge>
        );
      case "user_ban":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            User Ban
          </Badge>
        );
      case "post_rejection":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            Post Rejection
          </Badge>
        );
      case "category_creation":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            Category Creation
          </Badge>
        );
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const viewDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    setDetailsOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-full divide-y divide-border">
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="font-medium">Admin</TableHead>
              <TableHead className="font-medium">Action</TableHead>
              <TableHead className="font-medium hidden md:table-cell">
                Target
              </TableHead>
              <TableHead className="font-medium">Time</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No activities found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((activity) => (
                <TableRow key={activity.id} className="border-b last:border-0">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={activity.adminAvatar || ""}
                          alt={activity.adminName}
                        />
                        <AvatarFallback className="text-xs">
                          {activity.adminName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{activity.adminName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(activity.action)}
                      {getActionBadge(activity.action)}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 max-w-[250px] hidden md:table-cell">
                    <span className="truncate block">{activity.target}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-sm">
                      <div>{formatDate(activity.timestamp)}</div>
                      <div className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleDateString() ===
                        new Date().toLocaleDateString()
                          ? "Today"
                          : ""}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDetails(activity)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing <strong>{sortedData.length}</strong> of{" "}
          <strong>{activityLogData.length}</strong> activities
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>

      {/* Details Dialog - keeping the same as before */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        {selectedActivity && (
          <DialogContent className="max-w-md p-4 sm:p-6 md:p-8">
            <DialogHeader>
              <DialogTitle>Activity Details</DialogTitle>
              <DialogDescription>
                Complete information about this administrative action
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={selectedActivity.adminAvatar || ""}
                    alt={selectedActivity.adminName}
                  />
                  <AvatarFallback>
                    {selectedActivity.adminName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedActivity.adminName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Admin ID: {selectedActivity.adminId}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-medium">
                    {formatDate(selectedActivity.timestamp)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Activity ID: {selectedActivity.id}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Action Type
                  </h4>
                  <div className="flex items-center gap-2">
                    {getActionIcon(selectedActivity.action)}
                    {getActionBadge(selectedActivity.action)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Target
                  </h4>
                  <p>{selectedActivity.target}</p>
                  <p className="text-sm text-muted-foreground">
                    ID: {selectedActivity.targetId}
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Details
                </h4>
                <div className="bg-muted rounded-md p-4 text-sm">
                  {selectedActivity.action === "post_approval" &&
                    isPostApprovalDetails(selectedActivity.details) && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">
                              Previous Status:
                            </span>{" "}
                            {selectedActivity.details.previousStatus}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              New Status:
                            </span>{" "}
                            {selectedActivity.details.newStatus}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Category:
                          </span>{" "}
                          {selectedActivity.details.category}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Author:</span>{" "}
                          {selectedActivity.details.authorName} (
                          {selectedActivity.details.authorId})
                        </div>
                      </div>
                    )}

                  {selectedActivity.action === "user_update" &&
                    isUserUpdateDetails(selectedActivity.details) && (
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium mb-1">Role Change</h5>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {selectedActivity.details.changes.role.from}
                            </Badge>
                            <ArrowRight className="h-4 w-4" />
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {selectedActivity.details.changes.role.to}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-1">
                            Permissions Added
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {selectedActivity.details.changes.permissions.added.map(
                              (perm: string) => (
                                <Badge
                                  key={perm}
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  {perm}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {selectedActivity.action === "content_removal" &&
                    isContentRemovalDetails(selectedActivity.details) && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground">Reason:</span>{" "}
                          {selectedActivity.details.reason}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Report ID:
                          </span>{" "}
                          {selectedActivity.details.reportId}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Reported By:
                          </span>{" "}
                          {selectedActivity.details.reportedBy}
                        </div>
                      </div>
                    )}

                  {selectedActivity.action === "system_settings" &&
                    isSystemSettingsDetails(selectedActivity.details) && (
                      <div className="space-y-3">
                        {Object.entries(selectedActivity.details.changes).map(
                          ([key, value]: [
                            string,
                            { from: string; to: string }
                          ]) => (
                            <div key={key}>
                              <h5 className="font-medium mb-1">
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (str) => str.toUpperCase())}
                              </h5>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{value.from}</Badge>
                                <ArrowRight className="h-4 w-4" />
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  {value.to}
                                </Badge>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {selectedActivity.action === "user_ban" &&
                    isUserBanDetails(selectedActivity.details) && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground">Reason:</span>{" "}
                          {selectedActivity.details.reason}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Duration:
                          </span>{" "}
                          {selectedActivity.details.duration}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Previous Warnings:
                          </span>{" "}
                          {selectedActivity.details.previousWarnings}
                        </div>
                      </div>
                    )}

                  {selectedActivity.action === "post_rejection" &&
                    isPostRejectionDetails(selectedActivity.details) && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground">Reason:</span>{" "}
                          {selectedActivity.details.reason}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Feedback:
                          </span>{" "}
                          {selectedActivity.details.feedback}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Author ID:
                          </span>{" "}
                          {selectedActivity.details.authorId}
                        </div>
                      </div>
                    )}

                  {selectedActivity.action === "category_creation" &&
                    isCategoryCreationDetails(selectedActivity.details) && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground">
                            Parent Category:
                          </span>{" "}
                          {selectedActivity.details.parentCategory}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Description:
                          </span>{" "}
                          {selectedActivity.details.description}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Visibility:
                          </span>{" "}
                          {selectedActivity.details.visibility}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Details
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
