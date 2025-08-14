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
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  MoreHorizontal,
  XCircle,
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
import { UidDetailsDialog } from "./uid-management-dialog";

// Sample UID data
const uidData = [
  {
    uid: "UID-24060501",
    user: {
      name: "Kim Min-ji",
      avatar: "",
    },
    nickname: "crypto_mj",
    exchange: "Binance",
    situation: "verified",
    registrationDate: "2024-06-30T09:15:00",
    approvedBy: "Admin 1",
  },
  {
    uid: "UID-24060502",
    user: {
      name: "Park Ji-sung",
      avatar: "",
    },
    nickname: "park_trader",
    exchange: "Coinbase",
    situation: "pending",
    registrationDate: "2024-06-29T14:22:00",
    approvedBy: null,
  },
  {
    uid: "UID-24060503",
    user: {
      name: "Lee Soo-jin",
      avatar: "",
    },
    nickname: "soojin_crypto",
    exchange: "Kraken",
    situation: "verified",
    registrationDate: "2024-06-29T11:05:00",
    approvedBy: "Admin 2",
  },
  {
    uid: "UID-24060504",
    user: {
      name: "Choi Woo-shik",
      avatar: "",
    },
    nickname: "wooshik_btc",
    exchange: "Upbit",
    situation: "rejected",
    registrationDate: "2024-06-28T16:48:00",
    approvedBy: "Admin 3",
  },
  {
    uid: "UID-24060505",
    user: {
      name: "Kang Hye-jung",
      avatar: "",
    },
    nickname: "hyejung_eth",
    exchange: "Bithumb",
    situation: "pending",
    registrationDate: "2024-06-28T10:30:00",
    approvedBy: null,
  },
  {
    uid: "UID-24060506",
    user: {
      name: "Jung Ho-yeon",
      avatar: "",
    },
    nickname: "hoyeon_trader",
    exchange: "Binance",
    situation: "verified",
    registrationDate: "2024-06-27T15:40:00",
    approvedBy: "Admin 1",
  },
  {
    uid: "UID-24060507",
    user: {
      name: "Bae Suzy",
      avatar: "",
    },
    nickname: "suzy_crypto",
    exchange: "Coinbase",
    situation: "suspended",
    registrationDate: "2024-06-27T13:25:00",
    approvedBy: "Admin 2",
  },
  {
    uid: "UID-24060508",
    user: {
      name: "Gong Yoo",
      avatar: "",
    },
    nickname: "gongyoo_btc",
    exchange: "Kraken",
    situation: "verified",
    registrationDate: "2024-06-26T10:15:00",
    approvedBy: "Admin 3",
  },
  {
    uid: "UID-24060509",
    user: {
      name: "Son Ye-jin",
      avatar: "",
    },
    nickname: "yejin_trader",
    exchange: "Upbit",
    situation: "verified",
    registrationDate: "2024-06-25T16:20:00",
    approvedBy: "Admin 1",
  },
  {
    uid: "UID-24060510",
    user: {
      name: "Hyun Bin",
      avatar: "",
    },
    nickname: "binnie_crypto",
    exchange: "Bithumb",
    situation: "verified",
    registrationDate: "2024-06-25T11:45:00",
    approvedBy: "Admin 2",
  },
];

export type UidData = (typeof uidData)[0];

interface UidManagementTableProps {
  searchTerm: string;
  filters: {
    situation: string;
    exchange: string;
    dateRange: DateRange;
  };
}

export function UidManagementTable({
  searchTerm,
  filters,
}: UidManagementTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "registrationDate", desc: true },
  ]);
  const [selectedUid, setSelectedUid] = useState<UidData | null>(null);
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
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }, []);

  const columns = useMemo<ColumnDef<UidData>[]>(
    () => [
      {
        accessorKey: "uid",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              UID
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.getValue("uid")}</div>
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
          const user = row.getValue("user") as { name: string; avatar: string };
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="font-medium">{user.name}</div>
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
        accessorKey: "nickname",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Nickname
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => <div>{row.getValue("nickname")}</div>,
      },
      {
        accessorKey: "exchange",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Exchange
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => <div>{row.getValue("exchange")}</div>,
      },
      {
        accessorKey: "situation",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Situation
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const situation = row.getValue("situation") as string;
          return (
            <>
              {situation === "verified" && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-900/20 flex gap-1 items-center"
                >
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {situation === "pending" && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 flex gap-1 items-center"
                >
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              )}
              {situation === "rejected" && (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 dark:bg-red-900/20 flex gap-1 items-center"
                >
                  <XCircle className="h-3 w-3" />
                  Rejected
                </Badge>
              )}
              {situation === "suspended" && (
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 flex gap-1 items-center"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Suspended
                </Badge>
              )}
            </>
          );
        },
      },
      {
        accessorKey: "registrationDate",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Registration Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = formatDate(row.getValue("registrationDate"));
          const time = formatTime(row.getValue("registrationDate"));
          return (
            <div>
              <div>{date}</div>
              <div className="text-xs text-muted-foreground">{time}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "approvedBy",
        header: "Approved By",
        cell: ({ row }) => {
          const approvedBy = row.getValue("approvedBy") as string | null;
          return <div>{approvedBy || "-"}</div>;
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const uidData = row.original;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 cursor-pointer shadow-none"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedUid(uidData);
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
    [formatDate, formatTime, getInitials]
  );

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    return uidData.filter((uid) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          uid.uid.toLowerCase().includes(searchLower) ||
          uid.user.name.toLowerCase().includes(searchLower) ||
          uid.nickname.toLowerCase().includes(searchLower) ||
          uid.exchange.toLowerCase().includes(searchLower) ||
          uid.situation.toLowerCase().includes(searchLower) ||
          (uid.approvedBy &&
            uid.approvedBy.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Situation filter
      if (filters.situation !== "all" && uid.situation !== filters.situation) {
        return false;
      }

      // Exchange filter
      if (filters.exchange !== "all" && uid.exchange !== filters.exchange) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from) {
        const uidDate = new Date(uid.registrationDate);
        const startOfDay = new Date(filters.dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);

        if (uidDate < startOfDay) {
          return false;
        }
      }

      if (filters.dateRange.to) {
        const uidDate = new Date(uid.registrationDate);
        const endOfDay = new Date(filters.dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);

        if (uidDate > endOfDay) {
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
        setPageIndex((old) => updater({ pageIndex: old, pageSize }).pageIndex);
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

  // Clean up selected UID when dialog closes
  useEffect(() => {
    if (!detailsDialogOpen) {
      // Use a timeout to prevent memory leaks
      const timer = setTimeout(() => {
        setSelectedUid(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [detailsDialogOpen]);

  return (
    <>
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 py-4 w-full">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
            UIDs
          </p>
          <div className="flex items-center space-x-2">
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
        </div>
        <div className="flex items-center">
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

      {/* UID details dialog */}
      {selectedUid && (
        <UidDetailsDialog
          uidData={selectedUid}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </>
  );
}
