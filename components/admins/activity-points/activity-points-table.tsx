"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DateRange } from "react-day-picker";
import { ActivityPointsDetailsDialog } from "./activity-points-dialog";

const activityPointsData = [
  {
    act_id: "ACT-24060501",
    user: {
      first_name: "Kim",
      last_name: "Min-ji",
      avatar_url: "",
      uid: "UID-24060501",
    },
    exp_earned: 100,
    coins_earned: 500,
    transaction_type: "post_create",
    created_at: "2024-06-30T08:15:00",
    metadata: {
      post_title: "My First Post",
    },
  },
  {
    act_id: "ACT-24060502",
    user: {
      first_name: "Park",
      last_name: "Ji-sung",
      avatar_url: "",
      uid: "UID-24060502",
    },
    exp_earned: 50,
    coins_earned: 250,
    transaction_type: "comment_add",
    created_at: "2024-06-29T13:22:00",
    metadata: {
      post_title: "Interesting Discussion",
    },
  },
  {
    act_id: "ACT-24060503",
    user: {
      first_name: "Lee",
      last_name: "Soo-jin",
      avatar_url: "",
      uid: "UID-24060503",
    },
    exp_earned: 25,
    coins_earned: 100,
    transaction_type: "post_like",
    created_at: "2024-06-29T10:05:00",
    metadata: {
      post_title: "Amazing Content",
    },
  },
  {
    act_id: "ACT-24060504",
    user: {
      first_name: "Choi",
      last_name: "Woo-shik",
      avatar_url: "",
      uid: "UID-24060504",
    },
    exp_earned: 75,
    coins_earned: 300,
    transaction_type: "post_share",
    created_at: "2024-06-28T15:48:00",
    metadata: {
      post_title: "Shared Post",
      share_platform: "Twitter",
    },
  },
  {
    act_id: "ACT-24060505",
    user: {
      first_name: "Kang",
      last_name: "Hye-jung",
      avatar_url: "",
      uid: "UID-24060505",
    },
    exp_earned: 200,
    coins_earned: 1000,
    transaction_type: "welcome_bonus",
    created_at: "2024-06-28T09:30:00",
    metadata: {},
  },
  {
    act_id: "ACT-24060506",
    user: {
      first_name: "Jung",
      last_name: "Ho-yeon",
      avatar_url: "",
      uid: "UID-24060506",
    },
    exp_earned: 150,
    coins_earned: 750,
    transaction_type: "post_create",
    created_at: "2024-06-27T14:40:00",
    metadata: {
      post_title: "My Travel Experience",
    },
  },
  {
    act_id: "ACT-24060507",
    user: {
      first_name: "Bae",
      last_name: "Suzy",
      avatar_url: "",
      uid: "UID-24060507",
    },
    exp_earned: 30,
    coins_earned: 150,
    transaction_type: "post_like",
    created_at: "2024-06-27T12:25:00",
    metadata: {
      post_title: "Beautiful Sunset",
    },
  },
  {
    act_id: "ACT-24060508",
    user: {
      first_name: "Gong",
      last_name: "Yoo",
      avatar_url: "",
      uid: "UID-24060508",
    },
    exp_earned: 60,
    coins_earned: 300,
    transaction_type: "comment_add",
    created_at: "2024-06-26T09:15:00",
    metadata: {
      post_title: "Movie Review",
    },
  },
  {
    act_id: "ACT-24060509",
    user: {
      first_name: "Son",
      last_name: "Ye-jin",
      avatar_url: "",
      uid: "UID-24060509",
    },
    exp_earned: 90,
    coins_earned: 450,
    transaction_type: "post_share",
    created_at: "2024-06-25T15:20:00",
    metadata: {
      post_title: "Recipe Collection",
      share_platform: "Facebook",
    },
  },
  {
    act_id: "ACT-24060510",
    user: {
      first_name: "Hyun",
      last_name: "Bin",
      avatar_url: "",
      uid: "UID-24060510",
    },
    exp_earned: 200,
    coins_earned: 1000,
    transaction_type: "welcome_bonus",
    created_at: "2024-06-25T10:45:00",
    metadata: {},
  },
  {
    act_id: "ACT-24060511",
    user: {
      first_name: "Seo",
      last_name: "Yea-ji",
      avatar_url: "",
      uid: "UID-24060511",
    },
    exp_earned: 40,
    coins_earned: 200,
    transaction_type: "post_like",
    created_at: "2024-06-24T17:10:00",
    metadata: {
      post_title: "Art Gallery",
    },
  },
  {
    act_id: "ACT-24060512",
    user: {
      first_name: "Nam",
      last_name: "Joo-hyuk",
      avatar_url: "",
      uid: "UID-24060512",
    },
    exp_earned: 120,
    coins_earned: 600,
    transaction_type: "post_create",
    created_at: "2024-06-24T11:05:00",
    metadata: {
      post_title: "Fitness Journey",
    },
  },
  {
    act_id: "ACT-24060513",
    user: {
      first_name: "Han",
      last_name: "So-hee",
      avatar_url: "",
      uid: "UID-24060513",
    },
    exp_earned: 50,
    coins_earned: 250,
    transaction_type: "daily_login",
    created_at: "2024-06-23T16:45:00",
    metadata: {},
  },
  {
    act_id: "ACT-24060514",
    user: {
      first_name: "Kim",
      last_name: "Seon-ho",
      avatar_url: "",
      uid: "UID-24060514",
    },
    exp_earned: 70,
    coins_earned: 350,
    transaction_type: "comment_add",
    created_at: "2024-06-23T08:00:00",
    metadata: {
      post_title: "Photography Tips",
    },
  },
  {
    act_id: "ACT-24060515",
    user: {
      first_name: "Shin",
      last_name: "Min-a",
      avatar_url: "",
      uid: "UID-24060515",
    },
    exp_earned: 80,
    coins_earned: 400,
    transaction_type: "post_share",
    created_at: "2024-06-22T14:50:00",
    metadata: {
      post_title: "Book Review",
      share_platform: "Instagram",
    },
  },
];

export type ActivityPoints = (typeof activityPointsData)[0];

interface ActivityPointsTableProps {
  searchTerm: string;
  filters: {
    activityType: string;
    dateRange: DateRange;
  };
}

export function ActivityPointsTable({
  searchTerm,
  filters,
}: ActivityPointsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityPoints | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  // Format date to a readable format
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }, []);

  // Format time to a readable format
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, []);

  // Get initials from name
  const getInitials = useCallback((name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }, []);

  // Get activity type badge color
  const getActivityTypeBadgeClass = useCallback((activityType: string) => {
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
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/20";
      case "daily_login":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-900/20";
    }
  }, []);

  // Get activity type label
  const getActivityTypeLabel = useCallback((activityType: string) => {
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
        return "Daily Login";
      default:
        return activityType;
    }
  }, []);

  // Get content description from metadata
  const getContentDescription = useCallback((activity: ActivityPoints) => {
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
        return "Received welcome bonus for joining";
      case "daily_login":
        return "Daily login bonus";
      default:
        return "Performed an activity";
    }
  }, []);

  const columns = useMemo<ColumnDef<ActivityPoints>[]>(
    () => [
      {
        accessorKey: "act_id",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              ID
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.getValue("act_id")}</div>
        ),
      },
      {
        accessorKey: "user",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              User
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const user = row.getValue("user") as {
            first_name: string;
            last_name: string;
            avatar_url: string;
            uid: string;
          };
          const name = `${user.first_name} ${user.last_name}`;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url} alt={name} />
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">{user.uid}</div>
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const userA = rowA.getValue("user") as {
            first_name: string;
            last_name: string;
          };
          const userB = rowB.getValue("user") as {
            first_name: string;
            last_name: string;
          };
          const nameA = `${userA.first_name} ${userA.last_name}`;
          const nameB = `${userB.first_name} ${userB.last_name}`;
          return nameA.localeCompare(nameB);
        },
      },
      {
        accessorKey: "exp_earned",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Earned EXP
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const value = row.getValue("exp_earned") as number;
          return <div className="font-medium">{value} EXP</div>;
        },
      },
      {
        accessorKey: "coins_earned",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Earned KOR Coins
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const value = row.getValue("coins_earned") as number;
          return <div className="font-medium">{value} KOR</div>;
        },
      },
      {
        accessorKey: "transaction_type",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Activity Type
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const activityType = row.getValue("transaction_type") as string;
          const activityTypeLabel = getActivityTypeLabel(activityType);
          return (
            <Badge
              variant="outline"
              className={getActivityTypeBadgeClass(activityType)}
            >
              {activityTypeLabel}
            </Badge>
          );
        },
      },
      {
        accessorKey: "content",
        header: "Content",
        cell: ({ row }) => {
          const activity = row.original;
          const content = getContentDescription(activity);
          return <div className="max-w-xs truncate">{content}</div>;
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = formatDate(row.getValue("created_at"));
          const time = formatTime(row.getValue("created_at"));
          return (
            <div>
              <div>{date}</div>
              <div className="text-xs text-muted-foreground">{time}</div>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const activity = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedActivity(activity);
                      setDetailsDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      formatDate,
      formatTime,
      getInitials,
      getActivityTypeBadgeClass,
      getActivityTypeLabel,
      getContentDescription,
    ]
  );

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    return activityPointsData.filter((activity) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const userName =
          `${activity.user.first_name} ${activity.user.last_name}`.toLowerCase();
        const userUid = activity.user.uid.toLowerCase();
        const activityTypeLabel = getActivityTypeLabel(
          activity.transaction_type
        ).toLowerCase();
        const content = getContentDescription(activity).toLowerCase();

        const matchesSearch =
          activity.act_id.toLowerCase().includes(searchLower) ||
          userName.includes(searchLower) ||
          userUid.includes(searchLower) ||
          activityTypeLabel.includes(searchLower) ||
          content.includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Activity type filter
      if (
        filters.activityType !== "all" &&
        activity.transaction_type !== filters.activityType
      ) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from) {
        const activityDate = new Date(activity.created_at);
        const startOfDay = new Date(filters.dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);

        if (activityDate < startOfDay) {
          return false;
        }
      }

      if (filters.dateRange.to) {
        const activityDate = new Date(activity.created_at);
        const endOfDay = new Date(filters.dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);

        if (activityDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [searchTerm, filters, getActivityTypeLabel, getContentDescription]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex, pageSize });
        setPageIndex(newState.pageIndex);
        setPageSize(newState.pageSize);
      } else if (
        typeof updater === "object" &&
        updater !== null &&
        typeof updater.pageIndex === "number"
      ) {
        setPageIndex(updater.pageIndex);
      }
    },
  });

  // Reset to first page when filters change
  useEffect(() => {
    if (table) {
      table.setPageIndex(0);
    }
  }, [searchTerm, filters]);

  // Clean up selected activity when dialog closes
  useEffect(() => {
    if (!detailsDialogOpen) {
      const timer = setTimeout(() => {
        setSelectedActivity(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [detailsDialogOpen]);

  return (
    <>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`
                        ${header.id === "content" ? "hidden md:table-cell" : ""}
                        ${
                          header.id === "exp_earned"
                            ? "hidden lg:table-cell"
                            : ""
                        }
                        ${
                          header.id === "coins_earned"
                            ? "hidden lg:table-cell"
                            : ""
                        }
                      `}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`
                          ${
                            cell.column.id === "content"
                              ? "hidden md:table-cell"
                              : ""
                          }
                          ${
                            cell.column.id === "exp_earned"
                              ? "hidden lg:table-cell"
                              : ""
                          }
                          ${
                            cell.column.id === "coins_earned"
                              ? "hidden lg:table-cell"
                              : ""
                          }
                        `}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
            activities
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px] shadow-none cursor-pointer">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">per page</p>
        </div>

        <div className="flex items-center space-x-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => table.previousPage()}
                  aria-disabled={!table.getCanPreviousPage()}
                  tabIndex={!table.getCanPreviousPage() ? -1 : 0}
                  href="#"
                  style={{
                    pointerEvents: !table.getCanPreviousPage()
                      ? "none"
                      : undefined,
                  }}
                />
              </PaginationItem>
              {(() => {
                const pageCount = table.getPageCount();
                const pageIndex = table.getState().pagination.pageIndex;
                const pageButtons = [];
                const maxPageButtons = 5;
                let startPage = Math.max(0, pageIndex - 2);
                let endPage = Math.min(pageCount - 1, pageIndex + 2);
                if (pageIndex <= 1) {
                  endPage = Math.min(pageCount - 1, maxPageButtons - 1);
                }
                if (pageIndex >= pageCount - 2) {
                  startPage = Math.max(0, pageCount - maxPageButtons);
                }
                for (let i = startPage; i <= endPage; i++) {
                  pageButtons.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={i === pageIndex}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          table.setPageIndex(i);
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return pageButtons;
              })()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => table.nextPage()}
                  aria-disabled={!table.getCanNextPage()}
                  tabIndex={!table.getCanNextPage() ? -1 : 0}
                  href="#"
                  style={{
                    pointerEvents: !table.getCanNextPage() ? "none" : undefined,
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Activity details dialog */}
      {selectedActivity && (
        <ActivityPointsDetailsDialog
          activity={selectedActivity}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </>
  );
}
