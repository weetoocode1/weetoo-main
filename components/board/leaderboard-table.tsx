"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeaderboardTableProps, Post } from "@/types/post";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// Cache for storing fetched posts
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get cache from localStorage
const getCache = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`leaderboard-cache-${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.error("Cache read error:", error);
  }
  return null;
};

// Set cache to localStorage
const setCache = (key: string, data: Post[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `leaderboard-cache-${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Cache write error:", error);
  }
};

export function LeaderboardTable({ board }: LeaderboardTableProps) {
  const t = useTranslations("communityBoards");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      // Check cache first - if we have data, show it immediately
      const cacheKey = `${board}-leaderboard`;
      const cached = getCache(cacheKey);

      if (cached) {
        setPosts(cached);
        return; // No loading state needed for cached data
      }

      // If no cache, fetch data
      setLoading(true);

      try {
        // Convert board parameter to database format
        const boardParam = board.replace("-board", "");
        const response = await fetch(
          `/api/posts?board=${encodeURIComponent(boardParam)}&limit=100`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        const data = await response.json();

        // Cache the data
        setCache(cacheKey, data);

        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [board]);
  // Sort by views, likes, comments (descending)
  const sortedPosts = useMemo(
    () =>
      [...posts].sort((a, b) => {
        if (b.views !== a.views) return b.views - a.views;
        if (b.likes !== a.likes) return b.likes - a.likes;
        return b.comments - a.comments;
      }),
    [posts]
  );
  const top6 = sortedPosts.slice(0, 6);
  const rest = sortedPosts.slice(6);
  const leaderboardData = [...top6, ...rest];

  // Pagination state for table
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  const paginatedData = useMemo(
    () =>
      leaderboardData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [leaderboardData, pageIndex]
  );

  const columns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        header: t("rank"),
        accessorKey: "rank",
        cell: ({ row }) => (
          <span className="font-bold text-primary text-sm sm:text-base">
            {row.index + 1 + pageIndex * pageSize}
          </span>
        ),
        size: 60,
      },
      {
        header: t("title"),
        accessorKey: "title",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground line-clamp-1 text-sm sm:text-base">
            {row.original.title}
          </span>
        ),
        size: 300,
      },
      {
        header: t("author"),
        accessorKey: "author",
        cell: ({ row }) => {
          const author = row.original.author;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback className="text-xs">
                  {author.name
                    ? author.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs sm:text-sm font-medium text-foreground">
                {author.name}
              </span>
            </div>
          );
        },
        size: 180,
      },
      {
        header: t("views"),
        accessorKey: "views",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium text-sm sm:text-base">
            {row.original.views.toLocaleString()}
          </span>
        ),
        size: 100,
      },
      {
        header: t("likes"),
        accessorKey: "likes",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium text-sm sm:text-base">
            {row.original.likes.toLocaleString()}
          </span>
        ),
        size: 100,
      },
      {
        header: t("comments"),
        accessorKey: "comments",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium text-sm sm:text-base">
            {row.original.comments.toLocaleString()}
          </span>
        ),
        size: 100,
      },
      {
        header: t("created"),
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.createdAt}
          </span>
        ),
        size: 120,
      },
    ],
    [pageIndex, pageSize, t]
  );

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: "rank", desc: false }] },
    manualPagination: true,
    pageCount: Math.ceil(leaderboardData.length / pageSize),
    state: { pagination: { pageIndex, pageSize } },
  });

  if (loading) {
    return (
      <section className="mt-5">
        <div className="overflow-x-auto bg-background border shadow-lg rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground">
                  Rank
                </TableHead>
                <TableHead className="px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground">
                  Title
                </TableHead>
                <TableHead className="px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground hidden sm:table-cell">
                  Author
                </TableHead>
                <TableHead className="px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground">
                  Views
                </TableHead>
                <TableHead className="px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground hidden md:table-cell">
                  Likes
                </TableHead>
                <TableHead className="px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground hidden md:table-cell">
                  Comments
                </TableHead>
                <TableHead className="px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground hidden lg:table-cell">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, idx) => (
                <TableRow
                  key={idx}
                  className="hover:bg-muted/40 transition-colors border-b border-border"
                  style={{ height: 60 }}
                >
                  <TableCell className="px-2 sm:px-4 py-3 sm:py-4 align-middle">
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 sm:py-4 align-middle">
                    <div>
                      <Skeleton className="h-4 w-32 sm:w-48 mb-2" />
                      <Skeleton className="h-3 w-24 sm:w-32" />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 sm:py-4 align-middle hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 sm:h-7 sm:w-7 rounded-full" />
                      <Skeleton className="h-4 w-16 sm:w-20" />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 sm:py-4 align-middle">
                    <Skeleton className="h-4 w-10 sm:w-12" />
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 sm:py-4 align-middle hidden md:table-cell">
                    <Skeleton className="h-4 w-8 sm:w-10" />
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 sm:py-4 align-middle hidden md:table-cell">
                    <Skeleton className="h-4 w-10 sm:w-12" />
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 sm:py-4 align-middle hidden lg:table-cell">
                    <Skeleton className="h-3 w-12 sm:w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-5">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">
            {t("error")}: {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5">
      <div className="overflow-x-auto bg-background border shadow-lg rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground ${
                      header.id === "author" ? "hidden sm:table-cell" : ""
                    } ${
                      header.id === "likes" || header.id === "comments"
                        ? "hidden md:table-cell"
                        : ""
                    } ${header.id === "created" ? "hidden lg:table-cell" : ""}`}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row, idx) => (
              <TableRow
                key={row.id}
                className={
                  idx < 6
                    ? "bg-accent/10 hover:bg-accent/20 transition-colors border-b border-border rounded-md"
                    : "hover:bg-muted/40 transition-colors border-b border-border"
                }
                style={{
                  height: 60,
                  borderRadius: idx < 6 ? "0.5rem" : undefined,
                }}
              >
                {row.getVisibleCells().map((cell, cellIdx) => (
                  <TableCell
                    key={cell.id}
                    className={`px-2 sm:px-4 py-3 sm:py-4 align-middle ${
                      cell.column.id === "author" ? "hidden sm:table-cell" : ""
                    } ${
                      cell.column.id === "likes" ||
                      cell.column.id === "comments"
                        ? "hidden md:table-cell"
                        : ""
                    } ${
                      cell.column.id === "created" ? "hidden lg:table-cell" : ""
                    }`}
                  >
                    {/* Show excerpt under title for Title column */}
                    {cell.column.id === "rank" && idx < 6 ? (
                      <span className="flex items-center gap-1 font-bold text-primary text-sm sm:text-base">
                        <Star
                          size={14}
                          className="text-yellow-400 inline-block mb-0.5"
                        />
                        {row.index + 1 + pageIndex * pageSize}
                      </span>
                    ) : cell.column.id === "title" ? (
                      <Link
                        href={`/${board}/${row.original.id}`}
                        className="block hover:opacity-80 transition-opacity"
                      >
                        <div>
                          <div className="font-semibold text-foreground line-clamp-1 text-sm sm:text-base">
                            {row.original.title}
                          </div>
                          <div
                            className="text-xs sm:text-sm text-muted-foreground line-clamp-2 max-w-xs overflow-hidden text-ellipsis whitespace-normal"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {row.original.excerpt}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 px-2 sm:px-0">
        <button
          className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-primary bg-muted border border-border hover:bg-accent/20 transition-colors rounded-md"
          onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0}
        >
          {t("previous")}
        </button>
        <span className="text-muted-foreground text-xs sm:text-sm">
          {t("page")} {pageIndex + 1} {t("of")}{" "}
          {Math.ceil(leaderboardData.length / pageSize)}
        </span>
        <button
          className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-primary bg-muted border border-border hover:bg-accent/20 transition-colors rounded-md"
          onClick={() =>
            setPageIndex(
              Math.min(
                Math.ceil(leaderboardData.length / pageSize) - 1,
                pageIndex + 1
              )
            )
          }
          disabled={
            pageIndex >= Math.ceil(leaderboardData.length / pageSize) - 1
          }
        >
          {t("next")}
        </button>
      </div>
    </section>
  );
}
