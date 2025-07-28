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
import { WithdrawDetailsDialog } from "./withdraw-details-dialog";

// Sample withdraw data
const withdrawData = [
  {
    id: "WDR-24060501",
    user: {
      name: "Kim Min-ji",
      avatar: "",
      uid: "UID-24060501",
    },
    amount: 150000,
    withdrawalMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-30T08:15:00",
    approvedBy: "Admin 1",
  },
  {
    id: "WDR-24060502",
    user: {
      name: "Park Ji-sung",
      avatar: "",
      uid: "UID-24060502",
    },
    amount: 300000,
    withdrawalMethod: "Bank Transfer",
    situation: "pending",
    date: "2024-06-29T13:22:00",
    approvedBy: null,
  },
  {
    id: "WDR-24060503",
    user: {
      name: "Lee Soo-jin",
      avatar: "",
      uid: "UID-24060503",
    },
    amount: 750000,
    withdrawalMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-29T10:05:00",
    approvedBy: "Admin 2",
  },
  {
    id: "WDR-24060504",
    user: {
      name: "Choi Woo-shik",
      avatar: "",
      uid: "UID-24060504",
    },
    amount: 50000,
    withdrawalMethod: "Mobile Wallet",
    situation: "rejected",
    date: "2024-06-28T15:48:00",
    approvedBy: "Admin 3",
  },
  {
    id: "WDR-24060505",
    user: {
      name: "Kang Hye-jung",
      avatar: "",
      uid: "UID-24060505",
    },
    amount: 450000,
    withdrawalMethod: "Bank Transfer",
    situation: "pending",
    date: "2024-06-28T09:30:00",
    approvedBy: null,
  },
  {
    id: "WDR-24060506",
    user: {
      name: "Jung Ho-yeon",
      avatar: "",
      uid: "UID-24060506",
    },
    amount: 200000,
    withdrawalMethod: "Mobile Wallet",
    situation: "approved",
    date: "2024-06-27T14:40:00",
    approvedBy: "Admin 1",
  },
  {
    id: "WDR-24060507",
    user: {
      name: "Bae Suzy",
      avatar: "",
      uid: "UID-24060507",
    },
    amount: 100000,
    withdrawalMethod: "Mobile Wallet",
    situation: "approved",
    date: "2024-06-27T12:25:00",
    approvedBy: "Admin 2",
  },
  {
    id: "WDR-24060508",
    user: {
      name: "Gong Yoo",
      avatar: "",
      uid: "UID-24060508",
    },
    amount: 600000,
    withdrawalMethod: "Bank Transfer",
    situation: "pending",
    date: "2024-06-26T09:15:00",
    approvedBy: null,
  },
  {
    id: "WDR-24060509",
    user: {
      name: "Son Ye-jin",
      avatar: "",
      uid: "UID-24060509",
    },
    amount: 350000,
    withdrawalMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-25T15:20:00",
    approvedBy: "Admin 3",
  },
  {
    id: "WDR-24060510",
    user: {
      name: "Hyun Bin",
      avatar: "",
      uid: "UID-24060510",
    },
    amount: 500000,
    withdrawalMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-25T10:45:00",
    approvedBy: "Admin 1",
  },

  {
    id: "WDR-24060511",
    user: {
      name: "Seo Yea-ji",
      avatar: "",
      uid: "UID-24060511",
    },
    amount: 250000,
    withdrawalMethod: "Mobile Wallet",
    situation: "approved",
    date: "2024-06-24T17:10:00",
    approvedBy: "Admin 2",
  },
  {
    id: "WDR-24060512",
    user: {
      name: "Nam Joo-hyuk",
      avatar: "",
      uid: "UID-24060512",
    },
    amount: 800000,
    withdrawalMethod: "Bank Transfer",
    situation: "rejected",
    date: "2024-06-24T11:05:00",
    approvedBy: "Admin 3",
  },
  {
    id: "WDR-24060513",
    user: {
      name: "Han So-hee",
      avatar: "",
      uid: "UID-24060513",
    },
    amount: 120000,
    withdrawalMethod: "Mobile Wallet",
    situation: "pending",
    date: "2024-06-23T16:45:00",
    approvedBy: null,
  },
  {
    id: "WDR-24060514",
    user: {
      name: "Kim Seon-ho",
      avatar: "",
      uid: "UID-24060514",
    },
    amount: 950000,
    withdrawalMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-23T08:00:00",
    approvedBy: "Admin 1",
  },
  {
    id: "WDR-24060515",
    user: {
      name: "Shin Min-a",
      avatar: "",
      uid: "UID-24060515",
    },
    amount: 300000,
    withdrawalMethod: "Mobile Wallet",
    situation: "pending",
    date: "2024-06-22T14:50:00",
    approvedBy: null,
  },
  {
    id: "WDR-24060516",
    user: {
      name: "Lee Dong-wook",
      avatar: "",
      uid: "UID-24060516",
    },
    amount: 400000,
    withdrawalMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-21T09:35:00",
    approvedBy: "Admin 2",
  },
  {
    id: "WDR-24060517",
    user: {
      name: "IU",
      avatar: "",
      uid: "UID-24060517",
    },
    amount: 550000,
    withdrawalMethod: "Bank Transfer",
    situation: "rejected",
    date: "2024-06-21T07:20:00",
    approvedBy: "Admin 3",
  },
  {
    id: "WDR-24060518",
    user: {
      name: "Rowoon",
      avatar: "",
      uid: "UID-24060518",
    },
    amount: 150000,
    withdrawalMethod: "Mobile Wallet",
    situation: "approved",
    date: "2024-06-20T12:10:00",
    approvedBy: "Admin 1",
  },
  {
    id: "WDR-24060519",
    user: {
      name: "Kim Go-eun",
      avatar: "",
      uid: "UID-24060519",
    },
    amount: 220000,
    withdrawalMethod: "Mobile Wallet",
    situation: "pending",
    date: "2024-06-19T18:40:00",
    approvedBy: null,
  },
  {
    id: "WDR-24060520",
    user: {
      name: "Cha Eun-woo",
      avatar: "",
      uid: "UID-24060520",
    },
    amount: 1000000,
    withdrawalMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-18T10:00:00",
    approvedBy: "Admin 2",
  },
];

export type Withdraw = (typeof withdrawData)[0];

interface WithdrawTableProps {
  searchTerm: string;
  filters: {
    status: string;
    dateRange: DateRange;
  };
}

export function WithdrawTable({ searchTerm, filters }: WithdrawTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [selectedWithdraw, setSelectedWithdraw] = useState<Withdraw | null>(
    null
  );
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

  const columns = useMemo<ColumnDef<Withdraw>[]>(
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
              Amount
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
        accessorKey: "withdrawalMethod",
        header: "Withdrawal Method",
        cell: ({ row }) => <div>{row.getValue("withdrawalMethod")}</div>,
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
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const status = row.getValue("situation") as string;
          return (
            <>
              {status === "approved" && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-900/20 flex gap-1 items-center"
                >
                  <CheckCircle className="h-3 w-3" />
                  Approved
                </Badge>
              )}
              {status === "pending" && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 flex gap-1 items-center"
                >
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              )}
              {status === "rejected" && (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 dark:bg-red-900/20 flex gap-1 items-center"
                >
                  <XCircle className="h-3 w-3" />
                  Rejected
                </Badge>
              )}
            </>
          );
        },
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
          const withdraw = row.original;

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
                      setSelectedWithdraw(withdraw);
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
    [formatAmount, formatDate, formatTime, getInitials]
  );

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    return withdrawData.filter((withdraw) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          withdraw.id.toLowerCase().includes(searchLower) ||
          withdraw.user.name.toLowerCase().includes(searchLower) ||
          withdraw.user.uid.toLowerCase().includes(searchLower) ||
          withdraw.withdrawalMethod.toLowerCase().includes(searchLower) ||
          withdraw.situation.toLowerCase().includes(searchLower) ||
          (withdraw.approvedBy &&
            withdraw.approvedBy.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== "all" && withdraw.situation !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from) {
        const withdrawDate = new Date(withdraw.date);
        const startOfDay = new Date(filters.dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);

        if (withdrawDate < startOfDay) {
          return false;
        }
      }

      if (filters.dateRange.to) {
        const withdrawDate = new Date(withdraw.date);
        const endOfDay = new Date(filters.dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);

        if (withdrawDate > endOfDay) {
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

  // Clean up selected withdraw when dialog closes
  useEffect(() => {
    if (!detailsDialogOpen) {
      // Use a timeout to prevent memory leaks
      const timer = setTimeout(() => {
        setSelectedWithdraw(null);
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
            withdrawals
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
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

        <Pagination className="w-full sm:w-auto">
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
            {table.getPageCount() > 0 && (
              <>
                {Array.from({ length: table.getPageCount() }, (_, i) => i).map(
                  (pageIndex) => (
                    <PaginationItem key={pageIndex}>
                      <PaginationLink
                        href="#"
                        onClick={() => table.setPageIndex(pageIndex)}
                        isActive={
                          table.getState().pagination.pageIndex === pageIndex
                        }
                      >
                        {pageIndex + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
              </>
            )}
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

      {/* Withdraw details dialog */}
      {selectedWithdraw && (
        <WithdrawDetailsDialog
          withdraw={selectedWithdraw}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </>
  );
}
