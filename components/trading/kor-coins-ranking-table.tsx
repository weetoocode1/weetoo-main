"use client";

import { useMemo, useState, useCallback, memo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type PaginationState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Coins,
  Trophy,
  Medal,
  Award,
  Search,
  TrendingUp,
  Clock,
  Crown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface KorCoinsUser {
  id: string;
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  kor_coins: number;
  weekly_gain: number;
  last_active: string | null;
  rank?: number;
}

// Memoized components
const RankBadge = memo(({ rank }: { rank: number }) => {
  const getBadgeConfig = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: Trophy,
          className:
            "border-2 border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-transparent font-bold px-3 py-1.5",
          iconColor: "text-yellow-600 dark:text-yellow-400",
        };
      case 2:
        return {
          icon: Medal,
          className:
            "border-2 border-slate-400 text-slate-600 dark:text-slate-400 bg-transparent font-bold px-3 py-1.5",
          iconColor: "text-slate-600 dark:text-slate-400",
        };
      case 3:
        return {
          icon: Award,
          className:
            "border-2 border-orange-500 text-orange-600 dark:text-orange-400 bg-transparent font-bold px-3 py-1.5",
          iconColor: "text-orange-600 dark:text-orange-400",
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig(rank);

  if (!config) {
    return (
      <div className="w-12 text-center">
        <span className="font-semibold text-muted-foreground">#{rank}</span>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <Badge className={`font-bold px-3 py-1.5 ${config.className}`}>
      <Icon className={`w-3.5 h-3.5 mr-1.5 ${config.iconColor}`} />#{rank}
    </Badge>
  );
});
RankBadge.displayName = "RankBadge";

const OnlineIndicator = memo(({ isOnline }: { isOnline: boolean }) => (
  <div className="flex items-center gap-1.5">
    <div
      className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400 dark:bg-gray-600"
      )}
    />
    <span
      className={cn(
        "text-xs",
        isOnline
          ? "text-green-600 dark:text-green-400"
          : "text-muted-foreground"
      )}
    >
      {isOnline ? "Online" : "Offline"}
    </span>
  </div>
));
OnlineIndicator.displayName = "OnlineIndicator";

// Static configurations
const ROW_BACKGROUNDS = {
  1: "bg-gradient-to-r from-yellow-50/80 to-amber-50/60 dark:from-yellow-950/30 dark:to-amber-950/20 border-l-4 border-l-yellow-400",
  2: "bg-gradient-to-r from-slate-50/80 to-gray-50/60 dark:from-slate-950/30 dark:to-gray-950/20 border-l-4 border-l-slate-400",
  3: "bg-gradient-to-r from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20 border-l-4 border-l-orange-500",
  default: "hover:bg-muted/50 transition-colors",
} as const;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

function getMainName(user: KorCoinsUser) {
  if (
    (user.first_name && user.first_name.trim() !== "") ||
    (user.last_name && user.last_name.trim() !== "")
  ) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return "Unknown";
}

function getNickname(user: KorCoinsUser) {
  if (
    !user.nickname ||
    user.nickname.trim() === "" ||
    user.nickname.toLowerCase() === "unknown" ||
    user.nickname === "-"
  ) {
    return "@unknown";
  }
  return `@${user.nickname}`;
}

// Utility to format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${
      Math.floor(diff / 3600) > 1 ? "s" : ""
    } ago`;
  if (diff < 2592000)
    return `${Math.floor(diff / 86400)} day${
      Math.floor(diff / 86400) > 1 ? "s" : ""
    } ago`;
  return date.toLocaleDateString();
}

export const KorCoinsRankingTable = memo(
  ({ users }: { users: KorCoinsUser[] }) => {
    // Use the users prop as-is (already sorted and ranked)
    const data: KorCoinsUser[] = users;

    const [sorting, setSorting] = useState<SortingState>([
      { id: "kor_coins", desc: true },
    ]);
    const [pagination, setPagination] = useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");

    const getRowBackgroundClass = useCallback((rank: number) => {
      return (
        ROW_BACKGROUNDS[rank as keyof typeof ROW_BACKGROUNDS] ||
        ROW_BACKGROUNDS.default
      );
    }, []);

    const columns = useMemo<ColumnDef<KorCoinsUser>[]>(
      () => [
        {
          header: "Rank",
          accessorKey: "rank",
          cell: ({ row }) => (
            <div className="flex justify-center">
              <RankBadge rank={row.getValue("rank")} />
            </div>
          ),
          size: 100,
        },
        {
          header: "User",
          accessorKey: "id",
          cell: ({ row }) => {
            const user = row.original;
            const rank = user.rank ?? 0;
            return (
              <div className="flex items-center gap-3 py-1">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-border">
                    <AvatarImage
                      src={user.avatar_url || ""}
                      alt={getMainName(user)}
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                      {getMainName(user).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {getNickname(user)}
                    {rank === 1 && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {rank <= 3 && rank > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0.5"
                      >
                        Top {rank}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          },
          size: 300,
          filterFn: (row, id, value) => {
            const user = row.original;
            const searchValue = value.toLowerCase();
            return (
              getMainName(user).toLowerCase().includes(searchValue) ||
              getNickname(user).toLowerCase().includes(searchValue)
            );
          },
        },
        {
          header: "Kor-Coins",
          accessorKey: "kor_coins",
          cell: ({ row }) => {
            const coins = row.getValue("kor_coins") as number;
            const rank = row.original.rank ?? 0;
            return (
              <div className="flex items-center gap-2">
                <Coins
                  className={cn(
                    "w-5 h-5",
                    rank === 1
                      ? "text-yellow-500"
                      : rank === 2
                      ? "text-slate-400"
                      : rank === 3
                      ? "text-orange-500"
                      : "text-cyan-500"
                  )}
                />
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "font-bold",
                      rank === 1
                        ? "text-lg text-yellow-600 dark:text-yellow-400"
                        : rank === 2
                        ? "text-base text-slate-600 dark:text-slate-400"
                        : rank === 3
                        ? "text-base text-orange-600 dark:text-orange-400"
                        : "text-foreground"
                    )}
                  >
                    {new Intl.NumberFormat("en-US").format(coins)}
                  </span>
                  {rank <= 10 && (
                    <span className="text-xs text-muted-foreground">
                      +
                      {new Intl.NumberFormat("en-US").format(
                        row.original.weekly_gain || 0
                      )}{" "}
                      this week
                    </span>
                  )}
                </div>
              </div>
            );
          },
          size: 200,
        },
        {
          header: "Weekly Gain",
          accessorKey: "weekly_gain",
          cell: ({ row }) => {
            const gain = row.getValue("weekly_gain") as number;
            return (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  +{new Intl.NumberFormat("en-US").format(gain || 0)}
                </span>
              </div>
            );
          },
          size: 150,
        },
        {
          header: "Last Active",
          accessorKey: "updated_at",
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatRelativeTime(row.getValue("updated_at"))}
              </span>
            </div>
          ),
          size: 140,
        },
      ],
      []
    );

    const table = useReactTable({
      data,
      columns,
      state: {
        sorting,
        pagination,
        columnFilters,
        globalFilter,
      },
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      enableSortingRemoval: false,
      globalFilterFn: (row, columnId, filterValue) => {
        const user = row.original;
        const search = filterValue.toLowerCase();
        return (user.first_name &&
          user.first_name.toLowerCase().includes(search)) ||
          (user.last_name && user.last_name.toLowerCase().includes(search)) ||
          (user.nickname && user.nickname.toLowerCase().includes(search))
          ? true
          : false;
      },
    });

    const handlePageSizeChange = useCallback(
      (value: string) => {
        table.setPageSize(Number(value));
      },
      [table]
    );

    const handleFirstPage = useCallback(() => table.firstPage(), [table]);
    const handlePreviousPage = useCallback(() => table.previousPage(), [table]);
    const handleNextPage = useCallback(() => table.nextPage(), [table]);
    const handleLastPage = useCallback(() => table.lastPage(), [table]);

    return (
      <div className="space-y-6 select-none">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold">Full Rankings</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        <div className="bg-background overflow-hidden rounded-xl border shadow-sm">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b bg-muted/30"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className="h-12 font-semibold text-foreground"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            "flex h-full cursor-pointer items-center gap-2 select-none hover:text-foreground transition-colors",
                            header.index === 0
                              ? "justify-center"
                              : "justify-start"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: (
                              <ChevronUpIcon
                                className="shrink-0 opacity-60"
                                size={16}
                              />
                            ),
                            desc: (
                              <ChevronDownIcon
                                className="shrink-0 opacity-60"
                                size={16}
                              />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            header.index === 0 ? "text-center" : "text-left"
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-b last:border-b-0",
                      getRowBackgroundClass(row.original.rank ?? 0)
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4 px-4">
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
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 px-2 md:flex-row md:items-center md:justify-between">
          <div className="hidden sm:flex items-center gap-3">
            <Label
              htmlFor="rows-per-page-korcoins"
              className="max-sm:sr-only text-sm font-medium"
            >
              Rows per page
            </Label>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger
                id="rows-per-page-korcoins"
                className="w-fit whitespace-nowrap h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col items-center gap-4 w-full md:flex-row md:justify-end md:w-auto md:items-center">
            <div className="text-muted-foreground text-sm whitespace-nowrap">
              <span className="font-medium">
                Showing {table.getRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} users
              </span>
            </div>

            <div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 disabled:pointer-events-none disabled:opacity-50"
                      onClick={handleFirstPage}
                      disabled={!table.getCanPreviousPage()}
                      aria-label="Go to first page"
                    >
                      <ChevronFirstIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 disabled:pointer-events-none disabled:opacity-50"
                      onClick={handlePreviousPage}
                      disabled={!table.getCanPreviousPage()}
                      aria-label="Go to previous page"
                    >
                      <ChevronLeftIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 disabled:pointer-events-none disabled:opacity-50"
                      onClick={handleNextPage}
                      disabled={!table.getCanNextPage()}
                      aria-label="Go to next page"
                    >
                      <ChevronRightIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 disabled:pointer-events-none disabled:opacity-50"
                      onClick={handleLastPage}
                      disabled={!table.getCanNextPage()}
                      aria-label="Go to last page"
                    >
                      <ChevronLastIcon size={16} />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

KorCoinsRankingTable.displayName = "KorCoinsRankingTable";
