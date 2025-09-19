"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface RewardRow {
  id: string;
  created_at: string;
  type: string;
  title: string;
  exp_delta: number;
  kor_delta: number;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    nickname: string | null;
    avatar_url: string | null;
  };
}

interface PurchaseRow {
  id: string;
  created_at: string;
  type: "market_purchase";
  title: string;
  exp_delta: null;
  kor_delta: number; // negative for display
  user: RewardRow["user"];
}

interface MarketPurchaseData {
  id: string;
  created_at: string;
  product_name: string | null;
  total_price: number | null;
  user_id: string;
  users: RewardRow["user"][] | RewardRow["user"];
}

export function RewardTable() {
  const t = useTranslations("admin.activityLog");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const tableRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "rewards-with-purchases", typeFilter],
    queryFn: async (): Promise<(RewardRow | PurchaseRow)[]> => {
      const supabase = createClient();

      // Fetch rewards
      let rewardsQuery = supabase
        .from("rewards")
        .select(
          `id, created_at, type, title, exp_delta, kor_delta, user:users(id, first_name, last_name, email, nickname, avatar_url)`
        )
        .order("created_at", { ascending: false })
        .limit(2000);
      if (typeFilter !== "all" && typeFilter !== "market_purchase") {
        rewardsQuery = rewardsQuery.eq("type", typeFilter);
      }
      const [
        { data: rewards, error: rewardsError },
        { data: purchases, error: purchasesError },
      ] = await Promise.all([
        rewardsQuery,
        supabase
          .from("market_purchases")
          .select(
            `id, created_at, product_name, total_price, user_id, users!inner(id, first_name, last_name, email, nickname, avatar_url)`
          )
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);
      if (rewardsError) throw rewardsError;
      if (purchasesError) throw purchasesError;

      const mappedPurchases: PurchaseRow[] = (purchases || []).map(
        (p: MarketPurchaseData): PurchaseRow => {
          // Handle both array and single object cases
          const userData = Array.isArray(p.users) ? p.users[0] : p.users;

          return {
            id: p.id,
            created_at: p.created_at,
            type: "market_purchase",
            title: p.product_name || "Market Purchase",
            exp_delta: null,
            kor_delta: -Math.abs(p.total_price || 0),
            user: userData || {
              id: p.user_id || "unknown",
              first_name: null,
              last_name: null,
              email: null,
              nickname: null,
              avatar_url: null,
            },
          };
        }
      );

      const merged: (RewardRow | PurchaseRow)[] = [
        ...((rewards || []) as unknown as RewardRow[]),
        ...mappedPurchases,
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply filter if specifically asking market_purchase
      const filteredByType =
        typeFilter === "all"
          ? merged
          : merged.filter((r) => r.type === typeFilter);

      return filteredByType;
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const list = data || [];
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter((r) => {
      const fullName = `${r.user.first_name || ""} ${
        r.user.last_name || ""
      }`.trim();
      return (
        r.title.toLowerCase().includes(s) ||
        r.type.toLowerCase().includes(s) ||
        fullName.toLowerCase().includes(s) ||
        (r.user.nickname || "").toLowerCase().includes(s) ||
        (r.user.email || "").toLowerCase().includes(s)
      );
    });
  }, [data, searchTerm]);

  const totalPages = Math.ceil((filtered?.length || 0) / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = (filtered || []).slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Ctrl/Cmd+F to focus search (match admin UX)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-10">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border border-border rounded-none p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-10" ref={tableRef}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("table.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64 shadow-none rounded-none h-10"
            ref={searchInputRef}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-56 shadow-none rounded-none h-10">
              <SelectValue placeholder={t("filters.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
              <SelectItem value="post_created">
                {t("filters.typeNames.post_created")}
              </SelectItem>
              <SelectItem value="post_commented">
                {t("filters.typeNames.post_commented")}
              </SelectItem>
              <SelectItem value="post_liked">
                {t("filters.typeNames.post_liked")}
              </SelectItem>
              <SelectItem value="post_shared">
                {t("filters.typeNames.post_shared")}
              </SelectItem>
              <SelectItem value="daily_login">
                {t("filters.typeNames.daily_login")}
              </SelectItem>
              <SelectItem value="room_created">
                {t("filters.typeNames.room_created")}
              </SelectItem>
              <SelectItem value="market_purchase">
                {t("filters.typeNames.market_purchase")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-none relative">
        {/* Corner borders to match admin tables */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                  {t("table.columns.user")}
                </th>
                <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                  {t("table.columns.rewardType")}
                </th>
                <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                  {t("table.columns.exp")}
                </th>
                <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                  {t("table.columns.kor")}
                </th>
                <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                  {t("table.columns.date")}
                </th>
                <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                  {t("table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((r) => {
                const fullName =
                  `${r.user.first_name || ""} ${
                    r.user.last_name || ""
                  }`.trim() ||
                  r.user.nickname ||
                  r.user.email ||
                  r.user.id;
                const typeBadge = (() => {
                  const base =
                    "inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium border ";
                  switch (r.type) {
                    case "post_created":
                      return base + "bg-blue-50 text-blue-700 border-blue-200";
                    case "post_commented":
                      return (
                        base + "bg-purple-50 text-purple-700 border-purple-200"
                      );
                    case "post_liked":
                      return base + "bg-pink-50 text-pink-700 border-pink-200";
                    case "post_shared":
                      return (
                        base +
                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                      );
                    case "daily_login":
                      return (
                        base + "bg-amber-50 text-amber-700 border-amber-200"
                      );
                    case "room_created":
                      return (
                        base + "bg-indigo-50 text-indigo-700 border-indigo-200"
                      );
                    case "market_purchase":
                      return base + "bg-red-50 text-red-700 border-red-200";
                    default:
                      return base + "bg-muted text-foreground border-border";
                  }
                })();
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-muted/20">
                          <AvatarImage
                            src={r.user.avatar_url || undefined}
                            alt={fullName}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                            {fullName.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium text-sm truncate">
                            {fullName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {r.user.email || r.user.nickname || r.user.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <span className={typeBadge}>
                        {t(`filters.typeNames.${r.type}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-amber-600">
                      {r.type === "market_purchase"
                        ? "-"
                        : `+${(r as RewardRow).exp_delta}`}
                    </td>
                    <td
                      className={`px-6 py-4 font-mono text-sm ${
                        r.kor_delta < 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {r.kor_delta > 0 ? `+${r.kor_delta}` : `${r.kor_delta}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <RewardActions row={r as RewardRow} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="lg:hidden p-4 space-y-3">
          {currentRows.map((r) => {
            const fullName =
              `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() ||
              r.user.nickname ||
              r.user.email ||
              r.user.id;
            return (
              <div
                key={r.id}
                className="border border-border/30 rounded-none p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-muted/20">
                      <AvatarImage
                        src={r.user.avatar_url || undefined}
                        alt={fullName}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                        {fullName.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.user.email || r.user.nickname || r.user.id}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("mobile.type")}:
                    </span>{" "}
                    {r.type.replace(/_/g, " ")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("mobile.exp")}:
                    </span>{" "}
                    <span className="font-mono text-amber-600">
                      {r.type === "market_purchase"
                        ? "-"
                        : `+${(r as RewardRow).exp_delta}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("mobile.kor")}:
                    </span>{" "}
                    <span
                      className={`font-mono text-sm ${
                        r.kor_delta < 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {r.kor_delta > 0 ? `+${r.kor_delta}` : `${r.kor_delta}`}
                    </span>
                  </div>
                  <div>
                    <RewardActions row={r as RewardRow} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              start: startIndex + 1,
              end: Math.min(startIndex + itemsPerPage, filtered?.length || 0),
              total: filtered?.length || 0,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />{" "}
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              {t("pagination.next")} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardActions({ row }: { row: RewardRow }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin.activityLog");
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">{t("table.menu.open")}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-none">
          <DropdownMenuLabel>{t("table.menu.title")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            {t("table.menu.view")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-full lg:max-w-2xl rounded-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {t("detailsDialog.title")}
              </DialogTitle>
              <DialogDescription>
                {t("detailsDialog.description")}
              </DialogDescription>
            </DialogHeader>

            {/* User Info Section */}
            <div className="flex items-center space-x-4 p-4 border border-border">
              <Avatar className="h-14 w-14 ring-2 ring-muted/20">
                <AvatarImage
                  src={row.user.avatar_url || undefined}
                  alt={
                    (row.user.first_name || "") +
                    " " +
                    (row.user.last_name || "")
                  }
                />
                <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-semibold">
                  {(
                    row.user.first_name?.[0] ||
                    row.user.nickname?.[0] ||
                    "U"
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold truncate">
                    {(row.user.first_name || "") +
                      " " +
                      (row.user.last_name || "").trim() ||
                      row.user.nickname ||
                      row.user.email ||
                      row.user.id}
                  </h3>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {row.user.email || row.user.nickname || row.user.id}
                </div>
              </div>
              {/* Type badge */}
              <div>
                <span
                  className={`${(() => {
                    const base =
                      "inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium border ";
                    switch (row.type) {
                      case "post_created":
                        return (
                          base + "bg-blue-50 text-blue-700 border-blue-200"
                        );
                      case "post_commented":
                        return (
                          base +
                          "bg-purple-50 text-purple-700 border-purple-200"
                        );
                      case "post_liked":
                        return (
                          base + "bg-pink-50 text-pink-700 border-pink-200"
                        );
                      case "post_shared":
                        return (
                          base +
                          "bg-emerald-50 text-emerald-700 border-emerald-200"
                        );
                      case "daily_login":
                        return (
                          base + "bg-amber-50 text-amber-700 border-amber-200"
                        );
                      case "room_created":
                        return (
                          base +
                          "bg-indigo-50 text-indigo-700 border-indigo-200"
                        );
                      default:
                        return base + "bg-muted text-foreground border-border";
                    }
                  })()}`}
                >
                  {row.type.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="bg-muted/10 border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("detailsDialog.fields.rewardId")}
                </div>
                <div className="text-xs font-mono break-all">{row.id}</div>
              </div>
              <div className="bg-muted/10 border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("detailsDialog.fields.userId")}
                </div>
                <div className="text-xs font-mono break-all">{row.user.id}</div>
              </div>
              <div className="bg-muted/10 border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("detailsDialog.fields.title")}
                </div>
                <div className="text-sm font-medium">{row.title || "-"}</div>
              </div>
              <div className="bg-muted/10 border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("detailsDialog.fields.date")}
                </div>
                <div className="text-sm">
                  {new Date(row.created_at).toLocaleString()}
                </div>
              </div>
              <div className="bg-background border border-border p-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {t("detailsDialog.fields.exp")}
                </div>
                <div className="font-mono text-amber-600 text-sm">
                  {row.type === "market_purchase" ? "-" : `+${row.exp_delta}`}
                </div>
              </div>
              <div className="bg-background border border-border p-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {t("detailsDialog.fields.kor")}
                </div>
                <div
                  className={`font-mono text-sm ${
                    row.kor_delta < 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {row.kor_delta > 0 ? `+${row.kor_delta}` : `${row.kor_delta}`}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button onClick={() => setOpen(false)} className="rounded-none">
                {t("detailsDialog.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
