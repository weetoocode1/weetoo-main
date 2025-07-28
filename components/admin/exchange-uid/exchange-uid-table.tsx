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
  Eye,
  EyeOff,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DateRange } from "react-day-picker";
import { ExchangeUidDetailsDialog } from "./exchange-uid-dialog";
import { ExchangeUidEditDialog } from "./exchange-uid-edit-dialog";

const exchangeUidData = [
  {
    id: "1",
    name: "Kim Min-ji",
    uid: "EXUID-24060501",
    exchange: "Binance",
    phoneNumber: "+82-10-1234-5678",
    email: "kim.minji@example.com",
    registrationDate: "2024-06-30T09:15:00",
    situation: "verified",
  },
  {
    id: "2",
    name: "Park Ji-sung",
    uid: "EXUID-24060502",
    exchange: "Coinbase",
    phoneNumber: "+82-10-2345-6789",
    email: "park.jisung@example.com",
    registrationDate: "2024-06-29T14:22:00",
    situation: "pending",
  },
  {
    id: "3",
    name: "Lee Soo-jin",
    uid: "EXUID-24060503",
    exchange: "Kraken",
    phoneNumber: "+82-10-3456-7890",
    email: "lee.soojin@example.com",
    registrationDate: "2024-06-29T11:05:00",
    situation: "verified",
  },
  {
    id: "4",
    name: "Choi Woo-shik",
    uid: "EXUID-24060504",
    exchange: "Upbit",
    phoneNumber: "+82-10-4567-8901",
    email: "choi.wooshik@example.com",
    registrationDate: "2024-06-28T16:48:00",
    situation: "rejected",
  },
  {
    id: "5",
    name: "Kang Hye-jung",
    uid: "EXUID-24060505",
    exchange: "Bithumb",
    phoneNumber: "+82-10-5678-9012",
    email: "kang.hyejung@example.com",
    registrationDate: "2024-06-28T10:30:00",
    situation: "pending",
  },
  {
    id: "6",
    name: "Jung Ho-yeon",
    uid: "EXUID-24060506",
    exchange: "Binance",
    phoneNumber: "+82-10-6789-0123",
    email: "jung.hoyeon@example.com",
    registrationDate: "2024-06-27T15:40:00",
    situation: "verified",
  },
  {
    id: "7",
    name: "Bae Suzy",
    uid: "EXUID-24060507",
    exchange: "Coinbase",
    phoneNumber: "+82-10-7890-1234",
    email: "bae.suzy@example.com",
    registrationDate: "2024-06-27T13:25:00",
    situation: "suspended",
  },
  {
    id: "8",
    name: "Gong Yoo",
    uid: "EXUID-24060508",
    exchange: "Kraken",
    phoneNumber: "+82-10-8901-2345",
    email: "gong.yoo@example.com",
    registrationDate: "2024-06-26T10:15:00",
    situation: "verified",
  },
  {
    id: "9",
    name: "Son Ye-jin",
    uid: "EXUID-24060509",
    exchange: "Upbit",
    phoneNumber: "+82-10-9012-3456",
    email: "son.yejin@example.com",
    registrationDate: "2024-06-25T16:20:00",
    situation: "verified",
  },
  {
    id: "10",
    name: "Hyun Bin",
    uid: "EXUID-24060510",
    exchange: "Bithumb",
    phoneNumber: "+82-10-0123-4567",
    email: "hyun.bin@example.com",
    registrationDate: "2024-06-25T11:45:00",
    situation: "verified",
  },
  {
    id: "11",
    name: "Song Joong-ki",
    uid: "EXUID-24060511",
    exchange: "Binance",
    phoneNumber: "+82-10-1122-3344",
    email: "song.joongki@example.com",
    registrationDate: "2024-06-24T09:00:00",
    situation: "pending",
  },
  {
    id: "12",
    name: "Park Shin-hye",
    uid: "EXUID-24060512",
    exchange: "Coinbase",
    phoneNumber: "+82-10-2233-4455",
    email: "park.shinhye@example.com",
    registrationDate: "2024-06-23T14:30:00",
    situation: "verified",
  },
  {
    id: "13",
    name: "Lee Jong-suk",
    uid: "EXUID-24060513",
    exchange: "Kraken",
    phoneNumber: "+82-10-3344-5566",
    email: "lee.jongsuk@example.com",
    registrationDate: "2024-06-22T11:10:00",
    situation: "rejected",
  },
  {
    id: "14",
    name: "Kim Go-eun",
    uid: "EXUID-24060514",
    exchange: "Upbit",
    phoneNumber: "+82-10-4455-6677",
    email: "kim.goeun@example.com",
    registrationDate: "2024-06-21T16:55:00",
    situation: "verified",
  },
  {
    id: "15",
    name: "Nam Joo-hyuk",
    uid: "EXUID-24060515",
    exchange: "Bithumb",
    phoneNumber: "+82-10-5566-7788",
    email: "nam.joohyuk@example.com",
    registrationDate: "2024-06-20T10:40:00",
    situation: "pending",
  },
  {
    id: "16",
    name: "Han Hyo-joo",
    uid: "EXUID-24060516",
    exchange: "Binance",
    phoneNumber: "+82-10-6677-8899",
    email: "han.hyojoo@example.com",
    registrationDate: "2024-06-19T15:00:00",
    situation: "verified",
  },
  {
    id: "17",
    name: "Seo In-guk",
    uid: "EXUID-24060517",
    exchange: "Coinbase",
    phoneNumber: "+82-10-7788-9900",
    email: "seo.inguk@example.com",
    registrationDate: "2024-06-18T13:15:00",
    situation: "verified",
  },
  {
    id: "18",
    name: "Park Bo-young",
    uid: "EXUID-24060518",
    exchange: "Kraken",
    phoneNumber: "+82-10-8899-0011",
    email: "park.boyoung@example.com",
    registrationDate: "2024-06-17T10:20:00",
    situation: "suspended",
  },
  {
    id: "19",
    name: "Ryu Jun-yeol",
    uid: "EXUID-24060519",
    exchange: "Upbit",
    phoneNumber: "+82-10-9900-1122",
    email: "ryu.junyeol@example.com",
    registrationDate: "2024-06-16T16:05:00",
    situation: "verified",
  },
  {
    id: "20",
    name: "Lee Sung-kyung",
    uid: "EXUID-24060520",
    exchange: "Bithumb",
    phoneNumber: "+82-10-0011-2233",
    email: "lee.sungkyung@example.com",
    registrationDate: "2024-06-15T11:30:00",
    situation: "verified",
  },
];

export type ExchangeUidData = (typeof exchangeUidData)[0];

interface ExchangeUidTableProps {
  searchTerm: string;
  filters: {
    situation: string;
    exchange: string;
    dateRange: DateRange;
  };
}

export function ExchangeUidTable({
  searchTerm,
  filters,
}: ExchangeUidTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "registrationDate", desc: true },
  ]);
  const [selectedUid, setSelectedUid] = useState<ExchangeUidData | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

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

  // Mask sensitive information
  const maskPhoneNumber = useCallback(
    (phoneNumber: string) => {
      if (showSensitiveInfo) return phoneNumber;
      return phoneNumber.replace(/(\+\d{2}-\d{2}-)\d{4}-(\d{4})/, "$1****-$2");
    },
    [showSensitiveInfo]
  );

  const maskEmail = useCallback(
    (email: string) => {
      if (showSensitiveInfo) return email;
      const [username, domain] = email.split("@");
      const maskedUsername =
        username.substring(0, 2) + "*".repeat(username.length - 2);
      return `${maskedUsername}@${domain}`;
    },
    [showSensitiveInfo]
  );

  const columns = useMemo<ColumnDef<ExchangeUidData>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("name")}</div>
        ),
      },
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
        accessorKey: "phoneNumber",
        header: "Phone Number",
        cell: ({ row }) => (
          <div className="font-mono">
            {maskPhoneNumber(row.getValue("phoneNumber"))}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <div>{maskEmail(row.getValue("email"))}</div>,
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
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedUid(uidData);
                      setEditDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    Edit UID
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [formatDate, formatTime, maskPhoneNumber, maskEmail]
  );

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    return exchangeUidData.filter((uid) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          uid.name.toLowerCase().includes(searchLower) ||
          uid.uid.toLowerCase().includes(searchLower) ||
          uid.exchange.toLowerCase().includes(searchLower) ||
          uid.phoneNumber.toLowerCase().includes(searchLower) ||
          uid.email.toLowerCase().includes(searchLower) ||
          uid.situation.toLowerCase().includes(searchLower);

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
    if (!detailsDialogOpen && !editDialogOpen) {
      // Use a timeout to prevent memory leaks
      const timer = setTimeout(() => {
        setSelectedUid(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [detailsDialogOpen, editDialogOpen]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 ml-auto">
          <Switch
            id="show-sensitive-info"
            className="cursor-pointer"
            checked={showSensitiveInfo}
            onCheckedChange={setShowSensitiveInfo}
          />
          <Label
            htmlFor="show-sensitive-info"
            className="flex items-center gap-2"
          >
            {showSensitiveInfo ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Hide sensitive information</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Display sensitive information</span>
              </>
            )}
          </Label>
        </div>
      </div>

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
                    className="cursor-pointer hover:bg-muted/50 sm:cursor-default sm:hover:bg-transparent"
                    onClick={(e) => {
                      // Only open dialog on mobile screens
                      if (window.innerWidth < 640) {
                        // 640px is the 'sm' breakpoint in Tailwind
                        setSelectedUid(row.original);
                        setDetailsDialogOpen(true);
                      }
                    }}
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
            exchange UIDs
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
              {Array.from(
                { length: table.getPageCount() },
                (_, i) => i + 1
              ).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={() => table.setPageIndex(page - 1)}
                    isActive={
                      page - 1 === table.getState().pagination.pageIndex
                    }
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
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

      {/* Exchange UID details dialog */}
      {selectedUid && (
        <ExchangeUidDetailsDialog
          uidData={selectedUid}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          showSensitiveInfo={showSensitiveInfo}
        />
      )}

      {/* Exchange UID edit dialog */}
      {selectedUid && (
        <ExchangeUidEditDialog
          uidData={selectedUid}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </>
  );
}
