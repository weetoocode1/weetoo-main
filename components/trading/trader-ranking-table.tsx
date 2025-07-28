"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Award,
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  Crown,
  DollarSign,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RankedTrader {
  rank: number;
  trader: {
    name: string;
    username: string;
    avatar: string;
  };
  totalReturn: number;
  winRate: number;
  trades: number;
  portfolioValue: number;
  winStreak?: number;
  isHost?: boolean;
  isOnline: boolean;
}

// Move mock data outside component to prevent recreation on every render
const MOCK_RANKED_TRADERS: RankedTrader[] = [
  {
    rank: 1,
    trader: {
      name: "Alexander Chen",
      username: "@alexchen",
      avatar: "",
    },
    totalReturn: 247.8,
    winRate: 94.2,
    trades: 542,
    portfolioValue: 2847300,
    winStreak: 23,
    isOnline: true,
  },
  {
    rank: 2,
    trader: {
      name: "Sarah Kim",
      username: "@sarahkim",
      avatar: "",
    },
    totalReturn: 98.6,
    winRate: 79.1,
    trades: 287,
    portfolioValue: 986200,
    winStreak: 8,
    isOnline: false,
  },
  {
    rank: 3,
    trader: {
      name: "Michael Chen",
      username: "@michaelc",
      avatar: "",
    },
    totalReturn: 76.3,
    winRate: 77.8,
    trades: 198,
    portfolioValue: 763400,
    winStreak: 5,
    isOnline: true,
  },
  {
    rank: 4,
    trader: {
      name: "Olivia Martinez",
      username: "@oliviam",
      avatar: "",
    },
    totalReturn: 65.2,
    winRate: 75.0,
    trades: 150,
    portfolioValue: 652000,
    winStreak: 4,
    isOnline: true,
  },
  {
    rank: 5,
    trader: {
      name: "James Wilson",
      username: "@jamesw",
      avatar: "",
    },
    totalReturn: 60.8,
    winRate: 72.5,
    trades: 210,
    portfolioValue: 608000,
    winStreak: 6,
    isHost: true,
    isOnline: true,
  },
  {
    rank: 6,
    trader: {
      name: "Isabella Garcia",
      username: "@isabellag",
      avatar: "",
    },
    totalReturn: 55.1,
    winRate: 70.1,
    trades: 180,
    portfolioValue: 551000,
    winStreak: 3,
    isOnline: true,
  },
  {
    rank: 7,
    trader: {
      name: "Ethan Rodriguez",
      username: "@ethanr",
      avatar: "",
    },
    totalReturn: 50.5,
    winRate: 68.9,
    trades: 120,
    portfolioValue: 505000,
    winStreak: 2,
    isOnline: false,
  },
  {
    rank: 8,
    trader: {
      name: "Ava Smith",
      username: "@avas",
      avatar: "",
    },
    totalReturn: 48.3,
    winRate: 67.0,
    trades: 250,
    portfolioValue: 483000,
    winStreak: 7,
    isOnline: true,
  },
  {
    rank: 9,
    trader: {
      name: "Noah Johnson",
      username: "@noahj",
      avatar: "",
    },
    totalReturn: 45.9,
    winRate: 65.5,
    trades: 190,
    portfolioValue: 459000,
    winStreak: 1,
    isHost: true,
    isOnline: false,
  },
  {
    rank: 10,
    trader: {
      name: "Sophia Brown",
      username: "@sophiab",
      avatar: "",
    },
    totalReturn: 42.1,
    winRate: 63.2,
    trades: 160,
    portfolioValue: 421000,
    winStreak: 3,
    isOnline: true,
  },
  {
    rank: 11,
    trader: {
      name: "Liam Davis",
      username: "@liamd",
      avatar: "",
    },
    totalReturn: 40.0,
    winRate: 61.0,
    trades: 130,
    portfolioValue: 400000,
    winStreak: 2,
    isOnline: false,
  },
  {
    rank: 12,
    trader: {
      name: "Chloe Miller",
      username: "@chloem",
      avatar: "",
    },
    totalReturn: 38.5,
    winRate: 60.5,
    trades: 220,
    portfolioValue: 385000,
    winStreak: 1,
    isOnline: true,
  },
  {
    rank: 13,
    trader: {
      name: "Lucas Wilson",
      username: "@lucasw",
      avatar: "",
    },
    totalReturn: 35.2,
    winRate: 58.3,
    trades: 175,
    portfolioValue: 352000,
    winStreak: 4,
    isOnline: false,
  },
];

// Memoized components for better performance
const RankBadge = memo(({ rank }: { rank: number }) => {
  switch (rank) {
    case 1:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 font-bold px-3 py-1">
          <Award className="w-3.5 h-3.5 mr-1" />#{rank}
        </Badge>
      );
    case 2:
      return (
        <Badge className="bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700 font-bold px-3 py-1">
          <Award className="w-3.5 h-3.5 mr-1" />#{rank}
        </Badge>
      );
    case 3:
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700 font-bold px-3 py-1">
          <Star className="w-3.5 h-3.5 mr-1" />#{rank}
        </Badge>
      );
    default:
      return (
        <div className="w-12 text-center">
          <span className="font-semibold text-muted-foreground">#{rank}</span>
        </div>
      );
  }
});
RankBadge.displayName = "RankBadge";

// OnlineIndicator copied from kor-coins-ranking
const OnlineIndicator = memo(({ isOnline }: { isOnline: boolean }) => (
  <div className="flex items-center gap-1.5 mt-1">
    <div
      className={
        isOnline
          ? "w-2 h-2 rounded-full bg-green-500 animate-pulse"
          : "w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"
      }
    />
    <span
      className={
        isOnline
          ? "text-xs text-green-600 dark:text-green-400"
          : "text-xs text-muted-foreground"
      }
    >
      {isOnline ? "Online" : "Offline"}
    </span>
  </div>
));
OnlineIndicator.displayName = "OnlineIndicator";

const TraderCell = memo(
  ({
    trader,
    rank,
    isHost,
    isOnline,
  }: {
    trader: RankedTrader["trader"];
    rank: number;
    isHost?: boolean;
    isOnline: boolean;
  }) => (
    <div className="flex items-center gap-3 py-1">
      <Avatar className="h-10 w-10 ring-2 ring-border">
        <AvatarImage src={trader.avatar || ""} alt={trader.name} />
        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
          {trader.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <div>
        <div className="font-semibold text-foreground flex items-center gap-2">
          {trader.name}
          {isHost && <Crown className="h-3.5 w-3.5 text-amber-500" />}
          {rank <= 3 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Top {rank}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">{trader.username}</div>
        <OnlineIndicator isOnline={isOnline} />
      </div>
    </div>
  )
);
TraderCell.displayName = "TraderCell";

// Static row background classes to avoid recalculation
const ROW_BACKGROUNDS = {
  1: "bg-gradient-to-r from-yellow-50/80 to-amber-50/60 dark:from-yellow-950/30 dark:to-amber-950/20 border-l-4 border-l-yellow-400",
  2: "bg-gradient-to-r from-slate-50/80 to-gray-50/60 dark:from-slate-950/30 dark:to-gray-950/20 border-l-4 border-l-slate-400",
  3: "bg-gradient-to-r from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20 border-l-4 border-l-orange-500",
  default: "hover:bg-muted/50 transition-colors",
} as const;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export const TraderRankingTable = memo(() => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rank", desc: false },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const getRowBackgroundClass = useCallback((rank: number) => {
    return (
      ROW_BACKGROUNDS[rank as keyof typeof ROW_BACKGROUNDS] ||
      ROW_BACKGROUNDS.default
    );
  }, []);

  const columns = useMemo<ColumnDef<RankedTrader>[]>(
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
        header: "Trader",
        accessorKey: "trader",
        cell: ({ row }) => (
          <TraderCell
            trader={row.original.trader}
            rank={row.original.rank}
            isHost={row.original.isHost}
            isOnline={row.original.isOnline}
          />
        ),
        size: 280,
      },
      {
        header: "Total Return",
        accessorKey: "totalReturn",
        cell: ({ row }) => {
          const value = row.getValue("totalReturn") as number;
          return (
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-base">
              +{value.toFixed(1)}%
            </div>
          );
        },
        size: 140,
      },
      {
        header: "Win Rate",
        accessorKey: "winRate",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{row.getValue("winRate")}%</span>
          </div>
        ),
        size: 120,
      },
      {
        header: "Trades",
        accessorKey: "trades",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="font-medium">{row.getValue("trades")}</span>
          </div>
        ),
        size: 120,
      },
      {
        header: "Portfolio",
        accessorKey: "portfolioValue",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span>
              $
              {new Intl.NumberFormat("en-US").format(
                row.getValue("portfolioValue")
              )}
            </span>
          </div>
        ),
        size: 160,
      },
    ],
    []
  );

  const table = useReactTable({
    data: MOCK_RANKED_TRADERS,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
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
    <div className="space-y-6">
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-b last:border-b-0",
                    getRowBackgroundClass(row.original.rank)
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
                  No traders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-8 px-2">
        <div className="flex items-center gap-3">
          <Label
            htmlFor="rows-per-page-ranking"
            className="max-sm:sr-only text-sm font-medium"
          >
            Rows per page
          </Label>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger
              id="rows-per-page-ranking"
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

        <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
          <span className="font-medium">
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
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
  );
});

TraderRankingTable.displayName = "TraderRankingTable";
