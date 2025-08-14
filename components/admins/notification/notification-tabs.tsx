"use client";

import {
  BarChart2,
  Bell,
  CheckCircle,
  Coins,
  ExternalLink,
  LaptopIcon,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Add type definitions
interface BaseNotification {
  id: string;
  category: "korCoin" | "user" | "report" | "system";
  title: string;
  description: string;
  date: string;
  status: "read" | "unread";
  priority: "high" | "medium" | "low";
}

interface KorCoinNotification extends BaseNotification {
  category: "korCoin";
  type?: "deposit" | "withdrawal";
  user?: string;
  amount?: number;
  requiresApproval?: boolean;
  approved?: boolean;
}

type Notification = BaseNotification | KorCoinNotification;

interface NotificationData {
  all: Notification[];
  korCoin: KorCoinNotification[];
  user: BaseNotification[];
  report: BaseNotification[];
  system: BaseNotification[];
}

// Sample notification data
const notificationData: NotificationData = {
  all: [
    {
      id: "1",
      category: "system",
      title: "System Maintenance",
      description:
        "Scheduled maintenance will occur on July 5th from 2:00 AM to 4:00 AM UTC.",
      date: "2024-06-30T10:15:00",
      status: "unread",
      priority: "high",
    },
    {
      id: "2",
      category: "korCoin",
      title: "Large Deposit Detected",
      description:
        "A deposit of 1,500,000 KOR has been made by user Kim Min-ji.",
      date: "2024-06-29T15:30:00",
      status: "read",
      priority: "medium",
      type: "deposit",
      user: "Kim Min-ji",
      amount: 1500000,
      requiresApproval: true,
      approved: false,
    },
    {
      id: "3",
      category: "user",
      title: "New User Registration",
      description: "10 new users have registered in the last hour.",
      date: "2024-06-29T12:45:00",
      status: "unread",
      priority: "medium",
    },
    {
      id: "4",
      category: "report",
      title: "Monthly Report Available",
      description: "The June 2024 activity report is now available for review.",
      date: "2024-06-28T09:20:00",
      status: "read",
      priority: "low",
    },
    {
      id: "5",
      category: "system",
      title: "Security Update",
      description:
        "A security patch has been applied to the authentication system.",
      date: "2024-06-27T14:10:00",
      status: "unread",
      priority: "high",
    },
    {
      id: "6",
      category: "korCoin",
      title: "Withdrawal Request",
      description:
        "User Park Ji-sung has requested a withdrawal of 750,000 KOR.",
      date: "2024-06-26T11:05:00",
      status: "unread",
      priority: "high",
      type: "withdrawal",
      user: "Park Ji-sung",
      amount: 750000,
      requiresApproval: true,
      approved: false,
    },
    {
      id: "14",
      category: "user",
      title: "New User Registration",
      description: "10 new users have registered in the last hour.",
      date: "2024-06-29T12:45:00",
      status: "unread",
      priority: "medium",
    },
    {
      id: "15",
      category: "user",
      title: "New User Registration",
      description: "10 new users have registered in the last hour.",
      date: "2024-06-29T12:45:00",
      status: "unread",
      priority: "medium",
    },
    {
      id: "16",
      category: "user",
      title: "New User Registration",
      description: "10 new users have registered in the last hour.",
      date: "2024-06-29T12:45:00",
      status: "unread",
      priority: "medium",
    },
  ],
  korCoin: [
    {
      id: "2",
      category: "korCoin",
      title: "Large Deposit Detected",
      description:
        "A deposit of 1,500,000 KOR has been made by user Kim Min-ji.",
      date: "2024-06-29T15:30:00",
      status: "read",
      priority: "medium",
      type: "deposit",
      user: "Kim Min-ji",
      amount: 1500000,
      requiresApproval: true,
      approved: false,
    },
    {
      id: "6",
      category: "korCoin",
      title: "Withdrawal Request",
      description:
        "User Park Ji-sung has requested a withdrawal of 750,000 KOR.",
      date: "2024-06-26T11:05:00",
      status: "unread",
      priority: "high",
      type: "withdrawal",
      user: "Park Ji-sung",
      amount: 750000,
      requiresApproval: true,
      approved: false,
    },
    {
      id: "7",
      category: "korCoin",
      title: "Transaction Volume Alert",
      description:
        "Transaction volume has increased by 25% in the last 24 hours.",
      date: "2024-06-25T16:40:00",
      status: "unread",
      priority: "medium",
    },
    {
      id: "13",
      category: "korCoin",
      title: "Deposit Approved",
      description: "A deposit of 500,000 KOR by Lee Soo-jin has been approved.",
      date: "2024-06-24T13:20:00",
      status: "read",
      priority: "low",
      type: "deposit",
      user: "Lee Soo-jin",
      amount: 500000,
      requiresApproval: false,
      approved: true,
    },
    {
      id: "14",
      category: "korCoin",
      title: "Withdrawal Rejected",
      description:
        "A withdrawal request of 2,000,000 KOR by Choi Woo-shik has been rejected.",
      date: "2024-06-23T09:15:00",
      status: "read",
      priority: "medium",
      type: "withdrawal",
      user: "Choi Woo-shik",
      amount: 2000000,
      requiresApproval: false,
      approved: false,
    },
  ],
  user: [
    {
      id: "3",
      category: "user",
      title: "New User Registration",
      description: "10 new users have registered in the last hour.",
      date: "2024-06-29T12:45:00",
      status: "unread",
      priority: "medium",
    },
    {
      id: "8",
      category: "user",
      title: "User Verification Required",
      description: "5 users are awaiting verification approval.",
      date: "2024-06-24T10:30:00",
      status: "read",
      priority: "high",
    },
    {
      id: "9",
      category: "user",
      title: "Account Lockout",
      description:
        "User Lee Min-ho's account has been locked due to multiple failed login attempts.",
      date: "2024-06-23T13:15:00",
      status: "unread",
      priority: "high",
    },
  ],
  report: [
    {
      id: "4",
      category: "report",
      title: "Monthly Report Available",
      description: "The June 2024 activity report is now available for review.",
      date: "2024-06-28T09:20:00",
      status: "read",
      priority: "low",
    },
    {
      id: "10",
      category: "report",
      title: "Weekly Analytics Update",
      description: "User engagement has increased by 15% this week.",
      date: "2024-06-22T15:50:00",
      status: "unread",
      priority: "medium",
    },
    {
      id: "11",
      category: "report",
      title: "Audit Report Completed",
      description:
        "The quarterly audit report has been completed and is ready for review.",
      date: "2024-06-21T11:25:00",
      status: "read",
      priority: "medium",
    },
  ],
  system: [
    {
      id: "1",
      category: "system",
      title: "System Maintenance",
      description:
        "Scheduled maintenance will occur on July 5th from 2:00 AM to 4:00 AM UTC.",
      date: "2024-06-30T10:15:00",
      status: "unread",
      priority: "high",
    },
    {
      id: "5",
      category: "system",
      title: "Security Update",
      description:
        "A security patch has been applied to the authentication system.",
      date: "2024-06-27T14:10:00",
      status: "unread",
      priority: "high",
    },
    {
      id: "12",
      category: "system",
      title: "Database Optimization",
      description:
        "Database optimization has been completed. System performance has improved by 20%.",
      date: "2024-06-20T08:35:00",
      status: "read",
      priority: "medium",
    },
    {
      id: "15",
      category: "system",
      title: "New Feature Release",
      description:
        "A new feature has been released that allows users to customize their profiles.",
      date: "2024-06-19T17:45:00",
      status: "unread",
      priority: "low",
    },
  ],
};

// Format date
function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 24) {
    return `Today, ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (diffInHours < 48) {
    return `Yesterday, ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// Format amount
function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

// Get icon for notification category
function getCategoryIcon(category: string) {
  switch (category) {
    case "korCoin":
      return <Coins className="h-4 w-4" />;
    case "user":
      return <Users className="h-4 w-4" />;
    case "report":
      return <BarChart2 className="h-4 w-4" />;
    case "system":
      return <Settings className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

// Add type guard for KorCoin notifications
function isKorCoinNotification(
  notification: Notification
): notification is KorCoinNotification {
  return notification.category === "korCoin";
}

interface NotificationProps {
  searchTerm: string;
}

export function NotificationTabs({ searchTerm }: NotificationProps) {
  const [activeTab, setActiveTab] = useState("all");
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [showLeftChevron, setShowLeftChevron] = useState(false);
  const [showRightChevron, setShowRightChevron] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (tabsListRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = tabsListRef.current;
        console.log(
          "scrollWidth:",
          scrollWidth,
          "clientWidth:",
          clientWidth,
          "scrollLeft:",
          scrollLeft
        );
        setShowLeftChevron(scrollLeft > 0);
        setShowRightChevron(scrollLeft + clientWidth < scrollWidth);
      }
    };

    // Initial check and on resize
    // Defer checkScroll to ensure DOM is fully rendered
    const timeoutId = setTimeout(checkScroll, 0);

    window.addEventListener("resize", checkScroll);
    // Re-check when tabs content might change (e.g., search term changes)
    tabsListRef.current?.addEventListener("scroll", checkScroll);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkScroll);
      tabsListRef.current?.removeEventListener("scroll", checkScroll);
    };
  }, [searchTerm]);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsListRef.current) {
      const scrollAmount = tabsListRef.current.clientWidth / 2; // Scroll half the visible width
      if (direction === "left") {
        tabsListRef.current.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });
      } else {
        tabsListRef.current.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  // Filter notifications based on search
  const filteredNotifications = (
    Object.keys(notificationData) as (keyof typeof notificationData)[]
  ).reduce((acc, key) => {
    acc[key] = notificationData[key].filter(
      (notification) =>
        !searchTerm ||
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    return acc;
  }, {} as Record<keyof typeof notificationData, Notification[]>);

  // Count unread notifications by category
  const unreadCounts = {
    all: filteredNotifications.all.filter((n) => n.status === "unread").length,
    korCoin: filteredNotifications.korCoin.filter((n) => n.status === "unread")
      .length,
    user: filteredNotifications.user.filter((n) => n.status === "unread")
      .length,
    report: filteredNotifications.report.filter((n) => n.status === "unread")
      .length,
    system: filteredNotifications.system.filter((n) => n.status === "unread")
      .length,
  };

  return (
    <Tabs
      defaultValue="all"
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full h-full"
    >
      <div className="rounded-lg h-full flex flex-col">
        <div className="relative flex items-center w-full">
          {showLeftChevron && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scrollTabs("left")}
              className="absolute left-0 z-10 bg-background/80 hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div
            className="overflow-x-auto overflow-y-hidden flex-1"
            ref={tabsListRef}
          >
            <TabsList className="h-auto rounded-none border-b bg-transparent p-0 justify-start whitespace-nowrap w-full flex-grow-0 flex-shrink-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:after:bg-primary relative rounded-none py-3 -mb-0.5 px-4 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                <span>All</span>
                {unreadCounts.all > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {unreadCounts.all}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="korCoin"
                className="data-[state=active]:after:bg-primary relative rounded-none py-3 -mb-0.5 px-4 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 cursor-pointer"
              >
                <Coins className="h-4 w-4" />
                <span>KOR_Coin</span>
                {unreadCounts.korCoin > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {unreadCounts.korCoin}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="user"
                className="data-[state=active]:after:bg-primary relative rounded-none py-3 -mb-0.5 px-4 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <span>Users</span>
                {unreadCounts.user > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {unreadCounts.user}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="data-[state=active]:after:bg-primary relative rounded-none py-3 -mb-0.5 px-4 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 cursor-pointer"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Reports</span>
                {unreadCounts.report > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {unreadCounts.report}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="data-[state=active]:after:bg-primary relative rounded-none py-3 -mb-0.5 px-4 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 cursor-pointer"
              >
                <LaptopIcon className="h-4 w-4" />
                <span>System</span>
                {unreadCounts.system > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {unreadCounts.system}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          {showRightChevron && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scrollTabs("right")}
              className="absolute right-0 z-10 bg-background/80 hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {Object.keys(filteredNotifications).map((category) => (
            <TabsContent key={category} value={category} className="p-0 m-0">
              {filteredNotifications[
                category as keyof typeof filteredNotifications
              ].length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h2 className="text-lg font-medium mb-1">No notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm
                      ? "No notifications match your search criteria"
                      : "You're all caught up!"}
                  </p>
                </div>
              ) : (
                <div className="h-full">
                  {filteredNotifications[
                    category as keyof typeof filteredNotifications
                  ].map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className="border-b last:border-b-0"
                    >
                      <div className="px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4">
                        <div className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                          <div className="flex items-start gap-3 flex-1 flex-shrink">
                            {notification.status === "unread" && (
                              <div className="mt-1.5">
                                <div className="h-2 w-2 rounded-full bg-primary"></div>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 max-w-full">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-1">
                                <div className="text-sm font-medium leading-tight sm:leading-normal break-words">
                                  {notification.title}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    {getCategoryIcon(notification.category)}
                                    <span className="capitalize">
                                      {notification.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground break-words">
                                {notification.description}
                              </p>

                              {isKorCoinNotification(notification) &&
                                notification.type && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-0 gap-y-1.5 sm:gap-x-2 sm:gap-y-0 w-full min-w-0 max-w-full">
                                      <span className="px-2 py-0.5 bg-muted rounded-md capitalize break-words min-w-0 max-w-full block sm:inline">
                                        {notification.type}
                                      </span>
                                      <span className="hidden sm:inline">
                                        •
                                      </span>
                                      <span className="break-words min-w-0 max-w-full block sm:inline">
                                        User: {notification.user}
                                      </span>
                                      <span className="hidden sm:inline">
                                        •
                                      </span>
                                      <span className="break-words min-w-0 max-w-full block sm:inline">
                                        Amount:{" "}
                                        {formatAmount(notification.amount || 0)}{" "}
                                        KOR
                                      </span>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:items-end items-start gap-2 sm:mt-0 min-w-0 flex-shrink">
                            <div className="text-xs text-muted-foreground">
                              {formatDate(notification.date)}
                            </div>

                            {(!notification.category ||
                              notification.category !== "korCoin" ||
                              !isKorCoinNotification(notification) ||
                              !notification.requiresApproval) && (
                              <div className="flex gap-1 flex-wrap justify-end min-w-0 flex-shrink">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shadow-none cursor-pointer flex-shrink-0"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span className="sr-only">View</span>
                                </Button>
                                {notification.status === "unread" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 flex-shrink-0"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span className="sr-only">
                                      Mark as read
                                    </span>
                                  </Button>
                                )}
                              </div>
                            )}

                            {isKorCoinNotification(notification) &&
                              notification.requiresApproval &&
                              !notification.approved && (
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end min-w-0 flex-shrink">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs shadow-none cursor-pointer w-full sm:w-auto"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs shadow-none cursor-pointer w-full sm:w-auto"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </div>
      </div>
    </Tabs>
  );
}
