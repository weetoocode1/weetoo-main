"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Star } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { LeaderboardTableProps, Post } from "@/types/post";

export function LeaderboardTable({ board }: LeaderboardTableProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        // Convert board parameter to database format
        const boardParam = board.replace("-board", "");
        const response = await fetch(
          `/api/posts?board=${encodeURIComponent(boardParam)}&limit=100`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        const data = await response.json();
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
        header: "Rank",
        accessorKey: "rank",
        cell: ({ row }) => (
          <span className="font-bold text-primary">
            {row.index + 1 + pageIndex * pageSize}
          </span>
        ),
        size: 60,
      },
      {
        header: "Title",
        accessorKey: "title",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground line-clamp-1">
            {row.original.title}
          </span>
        ),
        size: 300,
      },
      {
        header: "Author",
        accessorKey: "author",
        cell: ({ row }) => {
          const author = row.original.author;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback>
                  {author.name
                    ? author.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                {author.name}
              </span>
            </div>
          );
        },
        size: 180,
      },
      {
        header: "Views",
        accessorKey: "views",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium">
            {row.original.views.toLocaleString()}
          </span>
        ),
        size: 100,
      },
      {
        header: "Likes",
        accessorKey: "likes",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium">
            {row.original.likes.toLocaleString()}
          </span>
        ),
        size: 100,
      },
      {
        header: "Comments",
        accessorKey: "comments",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium">
            {row.original.comments.toLocaleString()}
          </span>
        ),
        size: 100,
      },
      {
        header: "Created",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
        size: 120,
      },
    ],
    [pageIndex, pageSize]
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
        <div className="mb-5">
          <span className="text-lg md:text-xl font-semibold text-primary/90">
            Top Community Posts
          </span>
          <span className="ml-2 text-muted-foreground text-sm">
            — See what&apos;s trending and most discussed
          </span>
        </div>
        <div className="overflow-x-auto bg-background border shadow-lg rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="px-4 py-4 text-base font-semibold text-foreground">
                  Rank
                </TableHead>
                <TableHead className="px-4 py-4 text-base font-semibold text-foreground">
                  Title
                </TableHead>
                <TableHead className="px-4 py-4 text-base font-semibold text-foreground">
                  Author
                </TableHead>
                <TableHead className="px-4 py-4 text-base font-semibold text-foreground">
                  Views
                </TableHead>
                <TableHead className="px-4 py-4 text-base font-semibold text-foreground">
                  Likes
                </TableHead>
                <TableHead className="px-4 py-4 text-base font-semibold text-foreground">
                  Comments
                </TableHead>
                <TableHead className="px-4 py-4 text-base font-semibold text-foreground">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, idx) => (
                <TableRow
                  key={idx}
                  className="hover:bg-muted/40 transition-colors border-b border-border"
                  style={{ height: 72 }}
                >
                  <TableCell className="px-4 py-4 align-middle">
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell className="px-4 py-4 align-middle">
                    <div>
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-middle">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-middle">
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="px-4 py-4 align-middle">
                    <Skeleton className="h-4 w-10" />
                  </TableCell>
                  <TableCell className="px-4 py-4 align-middle">
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="px-4 py-4 align-middle">
                    <Skeleton className="h-3 w-16" />
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
        <div className="mb-5">
          <span className="text-lg md:text-xl font-semibold text-primary/90">
            Top Community Posts
          </span>
          <span className="ml-2 text-muted-foreground text-sm">
            — See what&apos;s trending and most discussed
          </span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5">
      <div className="mb-5">
        <span className="text-lg md:text-xl font-semibold text-primary/90">
          Top Community Posts
        </span>
        <span className="ml-2 text-muted-foreground text-sm">
          — See what’s trending and most discussed
        </span>
      </div>
      <div className="overflow-x-auto bg-background border shadow-lg rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 py-4 text-base font-semibold text-foreground"
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
                  height: 72,
                  borderRadius: idx < 6 ? "0.5rem" : undefined,
                }}
              >
                {row.getVisibleCells().map((cell, cellIdx) => (
                  <TableCell
                    key={cell.id}
                    className={
                      cellIdx === 1
                        ? "px-4 py-4 align-middle"
                        : "px-4 py-4 align-middle"
                    }
                  >
                    {/* Show excerpt under title for Title column */}
                    {cell.column.id === "rank" && idx < 6 ? (
                      <span className="flex items-center gap-1 font-bold text-primary">
                        <Star
                          size={16}
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
                          <div className="font-semibold text-foreground line-clamp-1">
                            {row.original.title}
                          </div>
                          <div
                            className="text-sm text-muted-foreground line-clamp-2 max-w-xs overflow-hidden text-ellipsis whitespace-normal"
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
      <div className="flex items-center justify-between mt-4">
        <button
          className="px-3 py-2 text-sm font-medium text-primary bg-muted border border-border hover:bg-accent/20 transition-colors rounded-md"
          onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0}
        >
          Previous
        </button>
        <span className="text-muted-foreground text-sm">
          Page {pageIndex + 1} of {Math.ceil(leaderboardData.length / pageSize)}
        </span>
        <button
          className="px-3 py-2 text-sm font-medium text-primary bg-muted border border-border hover:bg-accent/20 transition-colors rounded-md"
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
          Next
        </button>
      </div>
    </section>
  );
}
