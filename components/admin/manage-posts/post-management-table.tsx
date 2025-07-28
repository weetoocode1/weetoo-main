"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { formatDistanceToNow, format } from "date-fns";
import { PostDetailsDialog } from "./post-details-dialog";
import { DeletePostDialog } from "./delete-post-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  view_count: number;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  tags: string[];
  featured_images: string[];
}

interface PostManagementTableProps {
  searchTerm: string;
  filters: {
    category: string;
    status: string;
    dateRange: DateRange;
  };
  posts: Post[];
  loading: boolean;
  onApprovePost: (postId: string) => Promise<void>;
  onRejectPost: (postId: string) => Promise<void>;
  onToggleVisibility: (postId: string, currentStatus: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
}

export function PostManagementTable({
  searchTerm,
  filters,
  posts,
  loading,
  onApprovePost,
  onRejectPost,
  onToggleVisibility,
  onDeletePost,
}: PostManagementTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  // Format date to a readable format
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  }, []);

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Format category name
  const formatCategory = (category: string) => {
    if (!category) return "";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    return posts.filter((post) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const authorName = post.user
          ? `${post.user.first_name || ""} ${post.user.last_name || ""}`
              .trim()
              .toLowerCase()
          : "";

        const matchesSearch =
          post.title.toLowerCase().includes(searchLower) ||
          authorName.includes(searchLower) ||
          post.category.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category !== "all" && post.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status !== "all" && post.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.from) {
        const postDate = new Date(post.created_at);
        const startOfDay = new Date(filters.dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);

        if (postDate < startOfDay) {
          return false;
        }
      }

      if (filters.dateRange.to) {
        const postDate = new Date(post.created_at);
        const endOfDay = new Date(filters.dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);

        if (postDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [posts, searchTerm, filters]);

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Title
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium max-w-[300px] truncate">
            {row.getValue("title")}
          </div>
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
              Author
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const user = row.getValue("user") as {
            first_name: string;
            last_name: string;
            avatar_url: string;
          };
          const name = user
            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
            : "Anonymous";
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url || ""} alt={name} />
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="font-medium">{name}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Category
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div>{formatCategory(row.getValue("category"))}</div>
        ),
      },
      {
        accessorKey: "status",
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
          const status = row.getValue("status") as string;
          //   const post = row.original;
          // const moderatedById = post.moderated_by;
          // const moderatedAt = post.moderated_at
          //   ? formatDate(post.moderated_at)
          //   : "";
          // const isAutoApproved =
          //   status === "approved" && !moderatedById && post.moderated_at;

          return (
            <div>
              {status === "approved" && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-900/20"
                >
                  Approved
                </Badge>
              )}
              {status === "pending" && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20"
                >
                  Pending
                </Badge>
              )}
              {status === "rejected" && (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 dark:bg-red-900/20"
                >
                  Rejected
                </Badge>
              )}
              {status === "hidden" && (
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-700 dark:bg-slate-900/20"
                >
                  Hidden
                </Badge>
              )}
              {status === "deleted" && (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 dark:bg-red-900/20"
                >
                  Deleted
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "view_count",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="p-0 hover:bg-transparent"
            >
              Views
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="text-center w-full">
            {row.getValue("view_count") || 0}
          </div>
        ),
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
          const relativeTime = formatDistanceToNow(
            new Date(row.getValue("created_at")),
            { addSuffix: true }
          );
          return (
            <div>
              <div>{date}</div>
              <div className="text-xs text-muted-foreground">
                {relativeTime}
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const post = row.original;
          const isDeleted = post.status === "deleted";
          const isPending = post.status === "pending";
          const isApproved = post.status === "approved";
          //   const isHidden = post.status === "hidden";
          const isRejected = post.status === "rejected";

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
                      setSelectedPost(post);
                      setDetailsDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>

                  {isPending && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onApprovePost(post.id)}
                        className="cursor-pointer text-green-600"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onRejectPost(post.id)}
                        className="cursor-pointer text-red-600"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}

                  {!isDeleted && !isPending && !isRejected && (
                    <DropdownMenuItem
                      onClick={() => onToggleVisibility(post.id, post.status)}
                      className="cursor-pointer"
                    >
                      {isApproved ? (
                        <>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Hide Post
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Show Post
                        </>
                      )}
                    </DropdownMenuItem>
                  )}

                  {!isDeleted && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPost(post);
                        setDeleteDialogOpen(true);
                      }}
                      className="cursor-pointer text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [onApprovePost, onRejectPost, onToggleVisibility]
  );

  // Create table instance with memoized data
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
    table.setPageIndex(0);
  }, [searchTerm, filters, table]);

  // Clean up selected post when dialog closes
  useEffect(() => {
    if (!detailsDialogOpen && !deleteDialogOpen) {
      setSelectedPost(null);
    }
  }, [detailsDialogOpen, deleteDialogOpen]);

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
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Loading posts...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
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
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
            posts
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              table.setPageSize(Number(value));
              table.setPageIndex(0);
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
                const currentPageIndex = table.getState().pagination.pageIndex;
                const pageCount = table.getPageCount();
                const maxVisiblePages = 5;
                const pageButtons = [];

                // Calculate start and end page numbers
                let startPage = Math.max(
                  0,
                  currentPageIndex - Math.floor(maxVisiblePages / 2)
                );
                const endPage = Math.min(
                  pageCount - 1,
                  startPage + maxVisiblePages - 1
                );

                // Adjust start page if we're near the end
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(0, endPage - maxVisiblePages + 1);
                }

                // Add first page and ellipsis if needed
                if (startPage > 0) {
                  pageButtons.push(
                    <PaginationItem key={0}>
                      <PaginationLink
                        isActive={currentPageIndex === 0}
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
                  if (startPage > 1) {
                    pageButtons.push(
                      <PaginationItem key="start-ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                }

                // Add page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pageButtons.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={currentPageIndex === i}
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

                // Add last page and ellipsis if needed
                if (endPage < pageCount - 1) {
                  if (endPage < pageCount - 2) {
                    pageButtons.push(
                      <PaginationItem key="end-ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  pageButtons.push(
                    <PaginationItem key={pageCount - 1}>
                      <PaginationLink
                        isActive={currentPageIndex === pageCount - 1}
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

      {/* Post details dialog */}
      {selectedPost && (
        <PostDetailsDialog
          post={selectedPost}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onApprove={onApprovePost}
          onReject={onRejectPost}
        />
      )}

      {/* Delete post dialog */}
      {selectedPost && (
        <DeletePostDialog
          post={selectedPost}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDelete={() => onDeletePost(selectedPost.id)}
        />
      )}
    </>
  );
}
