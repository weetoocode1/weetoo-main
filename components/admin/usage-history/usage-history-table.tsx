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
import {
  ArrowUpDown,
  DollarSign,
  Gift,
  MoreHorizontal,
  Repeat,
  ShoppingBag,
  Star,
} from "lucide-react";
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
  PaginationEllipsis,
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
import { UsageDetailsDialog } from "./usage-details-dialog";

// Sample usage history data
const usageHistoryData = [
  {
    id: "USG-24060501",
    user: {
      name: "Kim Min-ji",
      avatar: "",
      uid: "UID-24060501",
    },
    amount: 5000,
    usageType: "purchase",
    usageTypeLabel: "Purchase",
    items: "Premium Trading Strategy Guide",
    date: "2024-06-30T09:15:00",
  },
  {
    id: "USG-24060502",
    user: {
      name: "Park Ji-sung",
      avatar: "",
      uid: "UID-24060502",
    },
    amount: 2500,
    usageType: "donation",
    usageTypeLabel: "Donation",
    items: "Content Creator Support",
    date: "2024-06-29T14:22:00",
  },
  {
    id: "USG-24060503",
    user: {
      name: "Lee Soo-jin",
      avatar: "",
      uid: "UID-24060503",
    },
    amount: 10000,
    usageType: "subscription",
    usageTypeLabel: "Subscription",
    items: "Premium Membership (1 Year)",
    date: "2024-06-29T11:05:00",
  },
  {
    id: "USG-24060504",
    user: {
      name: "Choi Woo-shik",
      avatar: "",
      uid: "UID-24060504",
    },
    amount: 3000,
    usageType: "premium",
    usageTypeLabel: "Premium Content",
    items: "Market Analysis Report",
    date: "2024-06-28T16:48:00",
  },
  {
    id: "USG-24060505",
    user: {
      name: "Kang Hye-jung",
      avatar: "",
      uid: "UID-24060505",
    },
    amount: 1000,
    usageType: "service",
    usageTypeLabel: "Service Fee",
    items: "Express Withdrawal Fee",
    date: "2024-06-28T10:30:00",
  },
  {
    id: "USG-24060506",
    user: {
      name: "Jung Ho-yeon",
      avatar: "",
      uid: "UID-24060506",
    },
    amount: 7500,
    usageType: "purchase",
    usageTypeLabel: "Purchase",
    items: "Trading Bot License",
    date: "2024-06-27T15:40:00",
  },
  {
    id: "USG-24060507",
    user: {
      name: "Bae Suzy",
      avatar: "",
      uid: "UID-24060507",
    },
    amount: 5000,
    usageType: "donation",
    usageTypeLabel: "Donation",
    items: "Charity Event",
    date: "2024-06-27T13:25:00",
  },
  {
    id: "USG-24060508",
    user: {
      name: "Gong Yoo",
      avatar: "",
      uid: "UID-24060508",
    },
    amount: 15000,
    usageType: "subscription",
    usageTypeLabel: "Subscription",
    items: "VIP Membership (2 Years)",
    date: "2024-06-26T10:15:00",
  },
  {
    id: "USG-24060509",
    user: {
      name: "Son Ye-jin",
      avatar: "",
      uid: "UID-24060509",
    },
    amount: 4000,
    usageType: "premium",
    usageTypeLabel: "Premium Content",
    items: "Advanced Trading Course",
    date: "2024-06-25T16:20:00",
  },
  {
    id: "USG-24060510",
    user: {
      name: "Hyun Bin",
      avatar: "",
      uid: "UID-24060510",
    },
    amount: 2000,
    usageType: "service",
    usageTypeLabel: "Service Fee",
    items: "Priority Support",
    date: "2024-06-25T11:45:00",
  },
  {
    id: "USG-24060511",
    user: {
      name: "Seo Ye-ji",
      avatar: "",
      uid: "UID-24060511",
    },
    amount: 12000,
    usageType: "purchase",
    usageTypeLabel: "Purchase",
    items: "Algorithmic Trading eBook",
    date: "2024-06-24T14:10:00",
  },
  {
    id: "USG-24060512",
    user: {
      name: "Nam Joo-hyuk",
      avatar: "",
      uid: "UID-24060512",
    },
    amount: 6000,
    usageType: "donation",
    usageTypeLabel: "Donation",
    items: "Platform Maintenance Support",
    date: "2024-06-24T09:05:00",
  },
  {
    id: "USG-24060513",
    user: {
      name: "Kim Se-jeong",
      avatar: "",
      uid: "UID-24060513",
    },
    amount: 8000,
    usageType: "subscription",
    usageTypeLabel: "Subscription",
    items: "Gold Membership (1 Year)",
    date: "2024-06-23T17:20:00",
  },
  {
    id: "USG-24060514",
    user: {
      name: "Lee Dong-wook",
      avatar: "",
      uid: "UID-24060514",
    },
    amount: 4500,
    usageType: "premium",
    usageTypeLabel: "Premium Content",
    items: "Daily Market Insights",
    date: "2024-06-22T13:50:00",
  },
  {
    id: "USG-24060515",
    user: {
      name: "Han So-hee",
      avatar: "",
      uid: "UID-24060515",
    },
    amount: 1500,
    usageType: "service",
    usageTypeLabel: "Service Fee",
    items: "Account Verification Fee",
    date: "2024-06-22T10:00:00",
  },
];

export type UsageHistory = (typeof usageHistoryData)[0];

interface UsageHistoryTableProps {
  searchTerm: string;
  filters: {
    usageType: string;
    dateRange: DateRange;
  };
}

export function UsageHistoryTable({
  searchTerm,
  filters,
}: UsageHistoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [selectedUsage, setSelectedUsage] = useState<UsageHistory | null>(null);
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

  // Format amount
  const formatAmount = useCallback((amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  }, []);

  // Get initials from name
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }, []);

  // Get usage type icon
  const getUsageTypeIcon = useCallback((usageType: string) => {
    switch (usageType) {
      case "purchase":
        return <ShoppingBag className="h-4 w-4 text-blue-500" />;
      case "donation":
        return <Gift className="h-4 w-4 text-pink-500" />;
      case "subscription":
        return <Repeat className="h-4 w-4 text-green-500" />;
      case "premium":
        return <Star className="h-4 w-4 text-amber-500" />;
      case "service":
        return <DollarSign className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  }, []);

  // Get usage type badge class
  const getUsageTypeBadgeClass = useCallback((usageType: string) => {
    switch (usageType) {
      case "purchase":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/20";
      case "donation":
        return "bg-pink-50 text-pink-700 dark:bg-pink-900/20";
      case "subscription":
        return "bg-green-50 text-green-700 dark:bg-green-900/20";
      case "premium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/20";
      case "service":
        return "bg-purple-50 text-purple-700 dark:bg-purple-900/20";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-900/20";
    }
  }, []);

  const columns = useMemo<ColumnDef<UsageHistory>[]>(
    () => [
      {
        accessorKey: "id",
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
          <div className="font-mono text-sm">{row.getValue("id")}</div>
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
            name: string;
            avatar: string;
            uid: string;
          };
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.uid}</div>
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const userA = rowA.getValue("user") as { name: string };
          const userB = rowB.getValue("user") as { name: string };
          return userA.name.localeCompare(userB.name);
        },
      },
      {
        accessorKey: "amount",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Amount Used
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const amount = row.getValue("amount") as number;
          return <div className="font-medium">{formatAmount(amount)} KOR</div>;
        },
      },
      {
        accessorKey: "usageType",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Usage Type
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const usageType = row.getValue("usageType") as string;
          const usageTypeLabel = row.original.usageTypeLabel;
          return (
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${getUsageTypeBadgeClass(
                usageType
              )}`}
            >
              {getUsageTypeIcon(usageType)}
              {usageTypeLabel}
            </Badge>
          );
        },
      },
      {
        accessorKey: "items",
        header: "Items/Donations",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.getValue("items")}</div>
        ),
      },
      {
        accessorKey: "date",
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
          const date = formatDate(row.getValue("date"));
          const time = formatTime(row.getValue("date"));
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
          const usage = row.original;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 shadow-none cursor-pointer"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedUsage(usage);
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
      formatAmount,
      formatDate,
      formatTime,
      getInitials,
      getUsageTypeIcon,
      getUsageTypeBadgeClass,
    ]
  );

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    return usageHistoryData.filter((usage) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          usage.id.toLowerCase().includes(searchLower) ||
          usage.user.name.toLowerCase().includes(searchLower) ||
          usage.user.uid.toLowerCase().includes(searchLower) ||
          usage.usageTypeLabel.toLowerCase().includes(searchLower) ||
          usage.items.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Usage type filter
      if (
        filters.usageType !== "all" &&
        usage.usageType !== filters.usageType
      ) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from) {
        const usageDate = new Date(usage.date);
        const startOfDay = new Date(filters.dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);

        if (usageDate < startOfDay) {
          return false;
        }
      }

      if (filters.dateRange.to) {
        const usageDate = new Date(usage.date);
        const endOfDay = new Date(filters.dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);

        if (usageDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [searchTerm, filters]);

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
    setPageIndex(0);
  }, [searchTerm, filters]);

  // Clean up selected usage when dialog closes
  useEffect(() => {
    if (!detailsDialogOpen) {
      // Use a timeout to prevent memory leaks
      const timer = setTimeout(() => {
        setSelectedUsage(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [detailsDialogOpen]);

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
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
                    <TableCell key={cell.id} className="whitespace-nowrap">
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
            usage records
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px] cursor-pointer shadow-none">
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
        <div className="flex items-center">
          <Pagination>
            <PaginationContent className="flex-wrap">
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
                if (startPage > 0) {
                  pageButtons.unshift(
                    <PaginationItem key="start-ellipsis">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                  pageButtons.unshift(
                    <PaginationItem key={0}>
                      <PaginationLink
                        isActive={pageIndex === 0}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          table.setPageIndex(0);
                        }}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                if (endPage < pageCount - 1) {
                  pageButtons.push(
                    <PaginationItem key="end-ellipsis">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                  pageButtons.push(
                    <PaginationItem key={pageCount - 1}>
                      <PaginationLink
                        isActive={pageIndex === pageCount - 1}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          table.setPageIndex(pageCount - 1);
                        }}
                      >
                        {pageCount}
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

      {/* Usage details dialog */}
      {selectedUsage && (
        <UsageDetailsDialog
          usage={selectedUsage}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </>
  );
}
