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
import { DepositDetailsDialog } from "./deposite-detail-dialog";

// Sample deposit data
const depositData = [
  {
    id: "DEP-24060501",
    user: {
      name: "Kim Min-ji",
      avatar: "",
      uid: "UID-24060501",
    },
    amount: 250000,
    paymentMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-30T09:15:00",
    approvedBy: "Admin 1",
  },
  {
    id: "DEP-24060502",
    user: {
      name: "Park Ji-sung",
      avatar: "",
      uid: "UID-24060502",
    },
    amount: 500000,
    paymentMethod: "Credit Card",
    situation: "pending",
    date: "2024-06-29T14:22:00",
    approvedBy: null,
  },
  {
    id: "DEP-24060503",
    user: {
      name: "Lee Soo-jin",
      avatar: "",
      uid: "UID-24060503",
    },
    amount: 1500000,
    paymentMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-29T11:05:00",
    approvedBy: "Admin 2",
  },
  {
    id: "DEP-24060504",
    user: {
      name: "Choi Woo-shik",
      avatar: "",
      uid: "UID-24060504",
    },
    amount: 100000,
    paymentMethod: "Mobile Payment",
    situation: "rejected",
    date: "2024-06-28T16:48:00",
    approvedBy: "Admin 3",
  },
  {
    id: "DEP-24060505",
    user: {
      name: "Kang Hye-jung",
      avatar: "",
      uid: "UID-24060505",
    },
    amount: 750000,
    paymentMethod: "Bank Transfer",
    situation: "pending",
    date: "2024-06-28T10:30:00",
    approvedBy: null,
  },
  {
    id: "DEP-24060506",
    user: {
      name: "Jung Ho-yeon",
      avatar: "",
      uid: "UID-24060506",
    },
    amount: 300000,
    paymentMethod: "Credit Card",
    situation: "approved",
    date: "2024-06-27T15:40:00",
    approvedBy: "Admin 1",
  },
  {
    id: "DEP-24060507",
    user: {
      name: "Bae Suzy",
      avatar: "",
      uid: "UID-24060507",
    },
    amount: 200000,
    paymentMethod: "Mobile Payment",
    situation: "approved",
    date: "2024-06-27T13:25:00",
    approvedBy: "Admin 2",
  },
  {
    id: "DEP-24060508",
    user: {
      name: "Gong Yoo",
      avatar: "",
      uid: "UID-24060508",
    },
    amount: 1000000,
    paymentMethod: "Bank Transfer",
    situation: "pending",
    date: "2024-06-26T10:15:00",
    approvedBy: null,
  },
  {
    id: "DEP-24060509",
    user: {
      name: "Son Ye-jin",
      avatar: "",
      uid: "UID-24060509",
    },
    amount: 450000,
    paymentMethod: "Credit Card",
    situation: "approved",
    date: "2024-06-25T16:20:00",
    approvedBy: "Admin 3",
  },
  {
    id: "DEP-24060510",
    user: {
      name: "Hyun Bin",
      avatar: "",
      uid: "UID-24060510",
    },
    amount: 800000,
    paymentMethod: "Bank Transfer",
    situation: "approved",
    date: "2024-06-25T11:45:00",
    approvedBy: "Admin 1",
  },
];

export type Deposit = (typeof depositData)[0];

interface DepositTableProps {
  searchTerm: string;
  filters: {
    status: string;
    paymentMethod: string;
    dateRange: DateRange;
    amountRange: string;
  };
}

export function DepositTable({ searchTerm, filters }: DepositTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);

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

  const columns = useMemo<ColumnDef<Deposit>[]>(
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
        accessorKey: "paymentMethod",
        header: "Payment Method",
        cell: ({ row }) => <div>{row.getValue("paymentMethod")}</div>,
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
          const deposit = row.original;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 cursor-pointer"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedDeposit(deposit);
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
    return depositData.filter((deposit) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          deposit.id.toLowerCase().includes(searchLower) ||
          deposit.user.name.toLowerCase().includes(searchLower) ||
          deposit.user.uid.toLowerCase().includes(searchLower) ||
          deposit.paymentMethod.toLowerCase().includes(searchLower) ||
          deposit.situation.toLowerCase().includes(searchLower) ||
          (deposit.approvedBy &&
            deposit.approvedBy.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== "all" && deposit.situation !== filters.status) {
        return false;
      }

      // Payment method filter
      if (
        filters.paymentMethod !== "all" &&
        deposit.paymentMethod !== filters.paymentMethod
      ) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from) {
        const depositDate = new Date(deposit.date);
        const startOfDay = new Date(filters.dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);

        if (depositDate < startOfDay) {
          return false;
        }
      }

      if (filters.dateRange.to) {
        const depositDate = new Date(deposit.date);
        const endOfDay = new Date(filters.dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);

        if (depositDate > endOfDay) {
          return false;
        }
      }

      // Amount range filter
      if (filters.amountRange !== "all") {
        const amount = deposit.amount;

        if (filters.amountRange === "0-100000") {
          if (amount > 100000) return false;
        } else if (filters.amountRange === "100000-500000") {
          if (amount < 100000 || amount > 500000) return false;
        } else if (filters.amountRange === "500000-1000000") {
          if (amount < 500000 || amount > 1000000) return false;
        } else if (filters.amountRange === "1000000+") {
          if (amount < 1000000) return false;
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
        pageIndex: 0,
        pageSize,
      },
    },
  });

  // Reset to first page when filters change
  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, filters, table]);

  // Clean up selected deposit when dialog closes
  useEffect(() => {
    if (!detailsDialogOpen) {
      // Use a timeout to prevent memory leaks
      const timer = setTimeout(() => {
        setSelectedDeposit(null);
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
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 py-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
            deposits
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="shadow-none cursor-pointer h-10"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shadow-none cursor-pointer h-10"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Deposit details dialog */}
      {selectedDeposit && (
        <DepositDetailsDialog
          deposit={selectedDeposit}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </>
  );
}
