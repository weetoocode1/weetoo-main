"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Book,
  Calendar,
  Edit,
  Eye,
  Eye as EyeIcon,
  FileText,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Search,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DeletePostDialog } from "./delete-post-dialog";
import { EditPostDialog } from "./edit-post-dialog";
import { ViewPostDialog } from "./view-post-dialog";

interface Post {
  id: string;
  board: string;
  title: string;
  excerpt: string | null;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  views: number;
  likes: number;
  comments: number;
  images: string[] | null;
  tags: string[] | null;
  // Joined author data
  author?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export function ManagePostTable() {
  const t = useTranslations("admin.managePosts.table");
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Dialog states
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "view" | "edit" | "delete" | null
  >(null);
  const [deletingPostId] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [virtualScrollEnabled, setVirtualScrollEnabled] = useState(false);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // const virtualScrollRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F: Focus search input
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Ctrl/Cmd + K: Focus search input (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Escape: Clear search and close dialogs
      if (e.key === "Escape") {
        if (searchTerm) {
          setSearchTerm("");
          setDebouncedSearchTerm("");
        }
        if (openDialog) {
          setOpenDialog(null);
        }
        return;
      }

      // Arrow keys for navigation (when no dialog is open)
      if (!openDialog && tableRef.current) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const focusableElements = tableRef.current.querySelectorAll(
            'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          const currentIndex = Array.from(focusableElements).findIndex(
            (el) => el === document.activeElement
          );

          if (currentIndex >= 0) {
            const nextIndex =
              e.key === "ArrowDown"
                ? Math.min(currentIndex + 1, focusableElements.length - 1)
                : Math.max(currentIndex - 1, 0);
            (focusableElements[nextIndex] as HTMLElement)?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm, openDialog]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch posts with author data
  const {
    data: posts,
    isLoading,
    // refetch,
  } = useQuery({
    queryKey: ["admin", "all-posts"],
    queryFn: async (): Promise<Post[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:users!posts_author_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter posts based on search term and board
  const filteredPosts =
    posts?.filter((post) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        post.title.toLowerCase().includes(searchLower) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchLower)) ||
        (post.content && post.content.toLowerCase().includes(searchLower)) ||
        (post.author &&
          post.author.first_name &&
          post.author.last_name &&
          `${post.author.first_name} ${post.author.last_name}`
            .toLowerCase()
            .includes(searchLower)) ||
        (post.tags &&
          post.tags.some((tag) => tag.toLowerCase().includes(searchLower)));

      const matchesBoard = boardFilter === "all" || post.board === boardFilter;

      return matchesSearch && matchesBoard;
    }) || [];

  // Virtual scrolling logic
  const shouldEnableVirtualScroll = filteredPosts.length > 50; // Enable for large lists

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  // Virtual scroll posts (show only visible + buffer)
  const virtualPosts =
    virtualScrollEnabled && shouldEnableVirtualScroll
      ? currentPosts.slice(0, Math.min(20, currentPosts.length)) // Show max 20 posts at once
      : currentPosts;

  const getBoardConfig = (board: string) => {
    const configs = {
      free: {
        label: "Free Board",
        color: "bg-blue-50/80 text-blue-700 border border-blue-200/60",
        icon: FileText,
      },
      education: {
        label: "Education Board",
        color: "bg-green-50/80 text-green-700 border border-green-200/60",
        icon: Book,
      },
      profit: {
        label: "Profit Board",
        color: "bg-purple-50/80 text-purple-700 border border-purple-200/60",
        icon: TrendingUp,
      },
    };
    return (
      configs[board as keyof typeof configs] || {
        label: board,
        color: "bg-muted/80 text-muted-foreground border border-border/60",
        icon: FileText,
      }
    );
  };

  // const handleDeletePost = async (postId: string) => {
  //   setDeletingPostId(postId);
  //   try {
  //     const supabase = createClient();
  //     const { error } = await supabase.from("posts").delete().eq("id", postId);

  //     if (error) throw error;

  //     toast.success("Post deleted successfully!");
  //     queryClient.invalidateQueries({ queryKey: ["admin", "all-posts"] });
  //     queryClient.invalidateQueries({ queryKey: ["admin", "post-stats"] });
  //   } catch (error) {
  //     console.error("Error deleting post:", error);
  //     toast.error("Failed to delete post. Please try again.");
  //   } finally {
  //     setDeletingPostId(null);
  //   }
  // };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-border rounded-none p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-10">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 shadow-none rounded-none h-10 bg-background border-border focus:border-primary"
            />
            {searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("count", {
              filtered: filteredPosts.length,
              total: posts?.length || 0,
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={boardFilter}
            onValueChange={(value) => {
              setIsFiltering(true);
              setBoardFilter(value);
              // Small delay to show loading state
              setTimeout(() => setIsFiltering(false), 300);
            }}
          >
            <SelectTrigger className="w-40 shadow-none rounded-none h-10 bg-background border-border focus:border-primary">
              <SelectValue placeholder={t("filters.allBoards")} />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">{t("filters.allBoards")}</SelectItem>
              <SelectItem value="free">{t("boards.free")}</SelectItem>
              <SelectItem value="education">{t("boards.education")}</SelectItem>
              <SelectItem value="profit">{t("boards.profit")}</SelectItem>
            </SelectContent>
          </Select>
          {isFiltering && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>

        {/* Virtual Scroll Toggle */}
        {shouldEnableVirtualScroll && (
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={virtualScrollEnabled}
                onChange={(e) => setVirtualScrollEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">
                Virtual Scroll ({virtualScrollEnabled ? "On" : "Off"})
              </span>
            </label>
            <span className="text-xs text-muted-foreground">
              Shows {virtualPosts.length} of {currentPosts.length} posts
            </span>
          </div>
        )}
      </div>

      {/* Posts List */}
      <div ref={tableRef}>
        {currentPosts.length === 0 ? (
          <div className="bg-card border border-border rounded-none relative overflow-hidden p-12 text-center">
            {/* Corner borders */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />
            <div className="text-muted-foreground">
              <div className="text-lg font-semibold mb-3 text-card-foreground">
                {searchTerm || boardFilter !== "all"
                  ? t("empty.noPostsFound")
                  : t("empty.noPostsYet")}
              </div>
              <div className="text-sm">
                {searchTerm || boardFilter !== "all"
                  ? t("empty.noMatch", {
                      term: searchTerm,
                      board:
                        boardFilter === "all"
                          ? t("filters.allBoards")
                          : t(`boards.${boardFilter}`),
                    })
                  : t("empty.noPostsCreated")}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {virtualPosts.map((post) => {
              const boardConfig = getBoardConfig(post.board);
              const BoardIcon = boardConfig.icon;
              const authorName =
                post.author && post.author.first_name && post.author.last_name
                  ? `${post.author.first_name} ${post.author.last_name}`
                  : "Unknown Author";

              return (
                <div
                  key={post.id}
                  className="group bg-card border border-border rounded-none p-4 relative overflow-hidden hover:bg-accent/30 hover:border-primary/30 transition-all duration-300 hover:shadow-md h-56 flex flex-col"
                >
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

                  {/* Post Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`p-2.5 rounded-lg ${boardConfig.color} flex-shrink-0`}
                    >
                      <BoardIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-card-foreground leading-5 line-clamp-1 mb-3">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/60 rounded-sm border border-border/40">
                          {boardConfig.label}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/80"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPost(post);
                            setOpenDialog("view");
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("menu.view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPost(post);
                            setOpenDialog("edit");
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {t("menu.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPost(post);
                            setOpenDialog("delete");
                          }}
                          className="text-destructive"
                          disabled={deletingPostId === post.id}
                        >
                          {deletingPostId === post.id ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                              {t("menu.deleting")}
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("menu.delete")}
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Post Content/Excerpt */}
                  {post.excerpt ? (
                    <div className="mb-3 flex-1">
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3 flex-1">
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed italic">
                        {t("excerpt.none")}
                      </p>
                    </div>
                  )}

                  {/* Post Info */}
                  <div className="space-y-2.5 mt-auto pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate font-medium text-foreground">
                        {authorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <EyeIcon className="h-3 w-3" />
                        <span className="font-medium">{post.views}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-3 w-3" />
                        <span className="font-medium">{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        <span className="font-medium">{post.comments}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium">
                        {new Date(post.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card border border-border rounded-none p-4 relative overflow-hidden">
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          <div className="text-sm text-muted-foreground font-medium">
            {t("pagination.showing", {
              start: startIndex + 1,
              end: Math.min(endIndex, filteredPosts.length),
              total: filteredPosts.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-none h-8 border-border hover:bg-muted/80"
            >
              {t("pagination.previous")}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                if (
                  totalPages <= 5 ||
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-none border-border hover:bg-muted/80"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="rounded-none h-8 border-border hover:bg-muted/80"
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {openDialog === "view" && selectedPost && (
        <ViewPostDialog
          post={selectedPost}
          open={openDialog === "view"}
          onOpenChange={(open) => setOpenDialog(open ? "view" : null)}
        />
      )}

      {openDialog === "edit" && selectedPost && (
        <EditPostDialog
          post={selectedPost}
          open={openDialog === "edit"}
          onOpenChange={(open: boolean) => setOpenDialog(open ? "edit" : null)}
          onPostUpdated={() => {
            setOpenDialog(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "all-posts"] });
            queryClient.invalidateQueries({
              queryKey: ["admin", "post-stats"],
            });
          }}
        />
      )}

      {openDialog === "delete" && selectedPost && (
        <DeletePostDialog
          post={selectedPost}
          open={openDialog === "delete"}
          onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}
          onPostDeleted={() => {
            setOpenDialog(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "all-posts"] });
            queryClient.invalidateQueries({
              queryKey: ["admin", "post-stats"],
            });
          }}
        />
      )}
    </div>
  );
}
