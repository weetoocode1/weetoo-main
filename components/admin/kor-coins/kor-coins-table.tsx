"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreHorizontal,
  Coins,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BalanceAdjustmentDialog } from "./balance-adjustment-dialog";
import { ViewProfileDialog } from "./view-profile-dialog";
import { useTranslations } from "next-intl";

interface UserKorCoins {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  kor_coins: number;
  created_at: string;
  avatar_url?: string;
}

export function KorCoinsTable() {
  const t = useTranslations("admin.korCoins.table");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"kor_coins" | "created_at" | "name">(
    "kor_coins"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Format number for display (Indian numbering system)
  const formatNumberForDisplay = (num: number) => {
    const str = num.toString();
    if (str.length <= 3) {
      return str;
    }
    const lastThree = str.slice(-3);
    const remaining = str.slice(0, -3);
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return formattedRemaining + "," + lastThree;
  };

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<UserKorCoins | null>(null);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [adjustmentAction, setAdjustmentAction] = useState<"add" | "subtract">(
    "add"
  );
  const [viewProfileDialog, setViewProfileDialog] = useState(false);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

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

      // Escape: Clear search
      if (e.key === "Escape") {
        if (searchTerm) {
          setSearchTerm("");
        }
        return;
      }

      // Arrow keys for navigation
      if (tableRef.current) {
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
  }, [searchTerm]);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "kor-coins-users"],
    queryFn: async (): Promise<UserKorCoins[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          kor_coins,
          created_at,
          avatar_url
        `
        )
        .order("kor_coins", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter and sort users
  const filteredUsers =
    users?.filter((user) => {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`
        .trim()
        .toLowerCase();
      const email = (user.email || "").toLowerCase();

      return fullName.includes(searchLower) || email.includes(searchLower);
    }) || [];

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: number | string | Date;
    let bValue: number | string | Date;

    if (sortBy === "name") {
      aValue = `${a.first_name || ""} ${a.last_name || ""}`
        .trim()
        .toLowerCase();
      bValue = `${b.first_name || ""} ${b.last_name || ""}`
        .trim()
        .toLowerCase();
    } else if (sortBy === "created_at") {
      aValue = new Date(a[sortBy] || new Date()).getTime();
      bValue = new Date(b[sortBy] || new Date()).getTime();
    } else {
      aValue = a[sortBy] || 0;
      bValue = b[sortBy] || 0;
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = sortedUsers.slice(startIndex, endIndex);

  const handleSort = (field: "kor_coins" | "created_at" | "name") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getBalanceStatus = (coins: number) => {
    // Handle null/undefined coins
    if (coins == null || isNaN(coins)) {
      return {
        label: t("status.unknown"),
        color: "bg-gray-100 text-gray-800 border-gray-300",
      };
    }

    if (coins >= 1000000)
      return {
        label: t("status.high"),
        color: "bg-green-100 text-green-800 border-green-300",
      };
    if (coins >= 500000)
      return {
        label: t("status.medium"),
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    return {
      label: t("status.low"),
      color: "bg-red-100 text-red-800 border-red-300",
    };
  };

  // Open adjustment dialog
  const openAdjustmentDialog = (
    user: UserKorCoins,
    action: "add" | "subtract"
  ) => {
    setSelectedUser(user);
    setAdjustmentAction(action);
    setAdjustmentDialog(true);
  };

  // Open view profile dialog
  const openViewProfileDialog = (user: UserKorCoins) => {
    setSelectedUser(user);
    setViewProfileDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-10">
        {/* Search Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-64" />
        </div>

        {/* Table Skeleton */}
        <div className="border border-border">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 border border-border/30"
              >
                <Skeleton className="h-12 w-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-10">
      {/* Search and Page Size */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64 shadow-none h-10 rounded-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("show")}</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => setItemsPerPage(parseInt(value))}
          >
            <SelectTrigger className="w-20 h-10 shadow-none rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="shadow-none rounded-none">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Table */}
      <div className="relative" ref={tableRef}>
        <div className="border border-border">
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.user")}
                        <span className="text-muted-foreground">
                          {sortBy === "name"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort("kor_coins")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.balance")}
                        <span className="text-muted-foreground">
                          {sortBy === "kor_coins"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.status")}
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort("created_at")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.joined")}
                        <span className="text-muted-foreground">
                          {sortBy === "created_at"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => {
                    const fullName =
                      `${user.first_name || ""} ${
                        user.last_name || ""
                      }`.trim() || t("empty.noUsers");
                    const balanceStatus = getBalanceStatus(user.kor_coins);
                    const isHighBalance = user.kor_coins >= 1000000;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-muted/20">
                              <AvatarImage
                                src={user.avatar_url}
                                alt={fullName}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                                {fullName && fullName.length > 0
                                  ? fullName.charAt(0).toUpperCase()
                                  : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium text-sm truncate">
                                {fullName}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Coins
                              className={`h-4 w-4 ${
                                isHighBalance
                                  ? "text-yellow-600"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <span className="font-mono font-medium text-sm">
                              {formatNumberForDisplay(user.kor_coins)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={`${balanceStatus.color} border`}
                          >
                            {balanceStatus.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">
                                    {t("menu.open")}
                                  </span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 shadow-none rounded-none"
                              >
                                <DropdownMenuLabel>
                                  {t("menu.title")}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openViewProfileDialog(user)}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  {t("menu.viewProfile")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    openAdjustmentDialog(user, "add")
                                  }
                                  className="text-green-600 focus:text-green-600"
                                >
                                  <TrendingUp className="mr-2 h-4 w-4" />
                                  {t("menu.addCoins")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openAdjustmentDialog(user, "subtract")
                                  }
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  <TrendingDown className="mr-2 h-4 w-4" />
                                  {t("menu.subtractCoins")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <div className="space-y-4 p-4">
              {currentUsers.map((user) => {
                const fullName =
                  `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                  t("empty.noUsers");
                const balanceStatus = getBalanceStatus(user.kor_coins);
                const isHighBalance = user.kor_coins >= 1000000;

                return (
                  <div
                    key={user.id}
                    className="border border-border/30 p-4 space-y-3"
                  >
                    {/* User Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-muted/20">
                          <AvatarImage src={user.avatar_url} alt={fullName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                            {fullName && fullName.length > 0
                              ? fullName.charAt(0).toUpperCase()
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{t("menu.open")}</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 shadow-none rounded-none hover:rounded-none"
                          >
                            <DropdownMenuLabel>
                              {t("menu.title")}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openViewProfileDialog(user)}
                            >
                              <User className="mr-2 h-4 w-4" />
                              {t("menu.viewProfile")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openAdjustmentDialog(user, "add")}
                              className="text-green-600 focus:text-green-600"
                            >
                              <TrendingUp className="mr-2 h-4 w-4" />
                              {t("menu.addCoins")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                openAdjustmentDialog(user, "subtract")
                              }
                              className="text-orange-600 focus:text-orange-600"
                            >
                              <TrendingDown className="mr-2 h-4 w-4" />
                              {t("menu.subtractCoins")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Coins
                          className={`h-4 w-4 ${
                            isHighBalance
                              ? "text-yellow-600"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="font-mono font-medium">
                          {formatNumberForDisplay(user.kor_coins)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${balanceStatus.color} border`}
                        >
                          {balanceStatus.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* No Results */}
          {currentUsers.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium mb-2">
                  {t("empty.title")}
                </div>
                <div className="text-sm">
                  {searchTerm ? t("empty.subtitle") : t("empty.noUsers")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              start: startIndex + 1,
              end: Math.min(endIndex, sortedUsers.length),
              total: sortedUsers.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("pagination.previous")}
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {/* First page */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(1)}
                  >
                    1
                  </Button>
                  {currentPage > 4 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                </>
              )}

              {/* Pages around current */}
              {(() => {
                const pages = [];
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, currentPage + 2);

                // Adjust start and end to always show 5 pages when possible
                if (end - start < 4 && totalPages > 5) {
                  if (start === 1) {
                    end = Math.min(totalPages, start + 4);
                  } else if (end === totalPages) {
                    start = Math.max(1, end - 4);
                  }
                }

                // For very few pages, show all pages
                if (totalPages <= 5) {
                  start = 1;
                  end = totalPages;
                }

                for (let page = start; page <= end; page++) {
                  pages.push(
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                }
                return pages;
              })()}

              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              {t("pagination.next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <BalanceAdjustmentDialog
        open={adjustmentDialog}
        onOpenChange={setAdjustmentDialog}
        user={selectedUser}
        action={adjustmentAction}
        onSuccess={() => {
          setAdjustmentDialog(false);
          setSelectedUser(null);
        }}
      />

      <ViewProfileDialog
        open={viewProfileDialog}
        onOpenChange={setViewProfileDialog}
        user={selectedUser}
      />
    </div>
  );
}
