"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  Hash,
  MoreHorizontal,
  Search,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface UidRecord {
  id: string;
  user_id: string;
  exchange_id: string;
  uid: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  exchange?: {
    name: string;
    logo: string;
    logo_color: string;
  };
}

export function AdminUidTable() {
  const t = useTranslations("admin.uidManagement.table");
  const tUidDetails = useTranslations("admin.uidManagement.uidDetailsDialog");
  const tUserDetails = useTranslations("admin.uidManagement.userDetailsDialog");

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    "created_at" | "exchange_id" | "is_active" | "updated_at"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exchangeFilter, setExchangeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [itemsPerPage] = useState(10);

  // Lightweight UI busy indicator for client-side interactions
  const [isUiBusy, setIsUiBusy] = useState(false);

  // Modal states
  const [selectedUid, setSelectedUid] = useState<UidRecord | null>(null);
  const [selectedUser, setSelectedUser] = useState<UidRecord | null>(null);
  const [isUidModalOpen, setIsUidModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsUiBusy(true);
    const timer = setTimeout(() => setIsUiBusy(false), 150);
    return () => clearTimeout(timer);
  }, [
    searchTerm,
    exchangeFilter,
    statusFilter,
    sortBy,
    sortOrder,
    currentPage,
  ]);

  const { data: uidRecords, isLoading } = useQuery({
    queryKey: ["admin", "all-uids"],
    queryFn: async (): Promise<UidRecord[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("user_broker_uids")
        .select(
          `
          *,
          user:users!user_broker_uids_user_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          exchange:exchanges!user_broker_uids_exchange_id_fkey(
            name,
            logo,
            logo_color
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
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
  });

  // Realtime: instantly reflect new/updated UIDs and optimistically update cache
  useEffect(() => {
    const supabase = createClient();

    const upsertUid = (row: UidRecord) => {
      if (!row || !row.id) return;
      queryClient.setQueryData(
        ["admin", "all-uids"],
        (oldData: UidRecord[]) => {
          const prev: UidRecord[] | undefined = oldData as
            | UidRecord[]
            | undefined;
          if (!prev) return prev;
          const index = prev.findIndex((u) => u.id === row.id);
          if (index === -1) {
            return [row, ...prev];
          }
          const copy = [...prev];
          copy[index] = { ...copy[index], ...row };
          return copy;
        }
      );
    };

    const removeUid = (row: UidRecord) => {
      if (!row || !row.id) return;
      queryClient.setQueryData(
        ["admin", "all-uids"],
        (oldData: UidRecord[]) => {
          const prev: UidRecord[] | undefined = oldData as
            | UidRecord[]
            | undefined;
          if (!prev) return prev;
          return prev.filter((u) => u.id !== row.id);
        }
      );
    };

    const channel = supabase
      .channel("admin-uids-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_broker_uids" },
        async (payload: { new: UidRecord }) => {
          // Fetch the complete record with user and exchange data
          const { data: completeRecord, error } = await supabase
            .from("user_broker_uids")
            .select(
              `
              *,
              user:users!user_broker_uids_user_id_fkey(
                first_name,
                last_name,
                email,
                avatar_url
              ),
              exchange:exchanges!user_broker_uids_exchange_id_fkey(
                name,
                logo,
                logo_color
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (!error && completeRecord) {
            upsertUid(completeRecord);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_broker_uids" },
        async (payload: { new: UidRecord }) => {
          // Fetch the complete record with user and exchange data
          const { data: completeRecord, error } = await supabase
            .from("user_broker_uids")
            .select(
              `
              *,
              user:users!user_broker_uids_user_id_fkey(
                first_name,
                last_name,
                email,
                avatar_url
              ),
              exchange:exchanges!user_broker_uids_exchange_id_fkey(
                name,
                logo,
                logo_color
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (!error && completeRecord) {
            upsertUid(completeRecord);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "user_broker_uids" },
        (payload: { old: Partial<UidRecord> }) => {
          removeUid(payload.old as UidRecord);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [queryClient]);

  // Realtime: instantly reflect new/updated UIDs and optimistically update cache
  useEffect(() => {
    const supabase = createClient();

    const upsertUid = (row: UidRecord) => {
      if (!row || !row.id) return;
      queryClient.setQueryData(
        ["admin", "all-uids"],
        (oldData: UidRecord[]) => {
          const prev: UidRecord[] | undefined = oldData as
            | UidRecord[]
            | undefined;
          if (!prev) return prev;
          const index = prev.findIndex((u) => u.id === row.id);
          if (index === -1) {
            return [row, ...prev];
          }
          const copy = [...prev];
          copy[index] = { ...copy[index], ...row };
          return copy;
        }
      );
    };

    const removeUid = (row: UidRecord) => {
      if (!row || !row.id) return;
      queryClient.setQueryData(
        ["admin", "all-uids"],
        (oldData: UidRecord[]) => {
          const prev: UidRecord[] | undefined = oldData as
            | UidRecord[]
            | undefined;
          if (!prev) return prev;
          return prev.filter((u) => u.id !== row.id);
        }
      );
    };

    const channel = supabase
      .channel("admin-uids-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_broker_uids" },
        async (payload: { new: UidRecord }) => {
          // Fetch the complete record with user and exchange data
          const { data: completeRecord, error } = await supabase
            .from("user_broker_uids")
            .select(
              `
              *,
              user:users!user_broker_uids_user_id_fkey(
                first_name,
                last_name,
                email,
                avatar_url
              ),
              exchange:exchanges!user_broker_uids_exchange_id_fkey(
                name,
                logo,
                logo_color
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (!error && completeRecord) {
            upsertUid(completeRecord);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_broker_uids" },
        async (payload: { new: UidRecord }) => {
          // Fetch the complete record with user and exchange data
          const { data: completeRecord, error } = await supabase
            .from("user_broker_uids")
            .select(
              `
              *,
              user:users!user_broker_uids_user_id_fkey(
                first_name,
                last_name,
                email,
                avatar_url
              ),
              exchange:exchanges!user_broker_uids_exchange_id_fkey(
                name,
                logo,
                logo_color
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (!error && completeRecord) {
            upsertUid(completeRecord);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "user_broker_uids" },
        (payload: { old: Partial<UidRecord> }) => {
          removeUid(payload.old as UidRecord);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [queryClient]);

  // Filter and sort UID records
  const filteredUidRecords =
    uidRecords?.filter((record) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        record.uid.toLowerCase().includes(searchLower) ||
        record.user?.first_name?.toLowerCase().includes(searchLower) ||
        record.user?.last_name?.toLowerCase().includes(searchLower) ||
        record.user?.email.toLowerCase().includes(searchLower) ||
        record.exchange?.name.toLowerCase().includes(searchLower);

      const matchesExchange =
        exchangeFilter === "all" || record.exchange_id === exchangeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && record.is_active) ||
        (statusFilter === "inactive" && !record.is_active);

      return matchesSearch && matchesExchange && matchesStatus;
    }) || [];

  const sortedUidRecords = [...filteredUidRecords].sort((a, b) => {
    let aValue: number | string | Date | boolean = a[sortBy];
    let bValue: number | string | Date | boolean = b[sortBy];

    if (sortBy === "created_at" || sortBy === "updated_at") {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedUidRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUidRecords = sortedUidRecords.slice(startIndex, endIndex);

  const handleSort = (
    field: "created_at" | "exchange_id" | "is_active" | "updated_at"
  ) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleViewDetails = (record: UidRecord) => {
    setSelectedUid(record);
    setIsUidModalOpen(true);
  };

  const handleViewUser = (record: UidRecord) => {
    setSelectedUser(record);
    setIsUserModalOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tUidDetails("copyToClipboard", { label }));
  };

  // Format date as text for CSV to avoid Excel showing ####
  const formatDateForCsv = (dateInput: string) => {
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return "";
      // en-CA gives YYYY-MM-DD; prefix with ' to force Excel to treat as text
      return `'${date.toLocaleDateString("en-CA")}`;
    } catch {
      return "";
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Prepare data for export
      const exportData = sortedUidRecords.map((record) => ({
        "UID ID": record.id,
        "User ID": record.user_id,
        "User Name":
          `${record.user?.first_name || ""} ${
            record.user?.last_name || ""
          }`.trim() || "Anonymous",
        "User Email": record.user?.email || "N/A",
        Exchange: record.exchange?.name || record.exchange_id,
        UID: record.uid,
        Status: record.is_active ? "Active" : "Inactive",
        Created: formatDateForCsv(record.created_at),
        "Last Updated": formatDateForCsv(record.updated_at),
      }));

      // Convert to CSV
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];
              // Escape commas and quotes in CSV
              if (
                typeof value === "string" &&
                (value.includes(",") || value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(",")
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `uid-records-export-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("exportSuccess", { count: exportData.length }));
    } catch (_error) {
      console.error("Export failed:", _error);
      toast.error(t("exportError"));
    } finally {
      setIsExporting(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-3 mt-10">
        {/* Search and Filters Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Table Skeleton */}
        <div className="border border-border rounded-none">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 border border-border/30"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
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
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64 shadow-none rounded-none h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
            <SelectTrigger className="w-40 shadow-none rounded-none h-10">
              <SelectValue placeholder={t("filters.allExchanges")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allExchanges")}</SelectItem>
              {Array.from(
                new Set(uidRecords?.map((r) => r.exchange_id) || [])
              ).map((exchangeId) => (
                <SelectItem key={exchangeId} value={exchangeId}>
                  {uidRecords?.find((r) => r.exchange_id === exchangeId)
                    ?.exchange?.name || exchangeId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 shadow-none rounded-none h-10">
              <SelectValue placeholder={t("filters.allStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allStatus")}</SelectItem>
              <SelectItem value="active">{t("filters.active")}</SelectItem>
              <SelectItem value="inactive">{t("filters.inactive")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="shadow-none rounded-none h-10"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <svg
                className="animate-spin h-4 w-4 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t("export")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Custom Table */}
      <div className="relative" ref={tableRef}>
        {isUiBusy && (
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary/70 animate-pulse z-10" />
        )}
        <div className="border border-border rounded-none">
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
                        onClick={() => handleSort("created_at")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.user")}
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
                      {t("columns.uid")}
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort("exchange_id")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.exchange")}
                        <span className="text-muted-foreground">
                          {sortBy === "exchange_id"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort("is_active")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.status")}
                        <span className="text-muted-foreground">
                          {sortBy === "is_active"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.created")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentUidRecords.map((record) => {
                    const fullName =
                      record.user?.first_name && record.user?.last_name
                        ? `${record.user.first_name} ${record.user.last_name}`
                        : "Anonymous";

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-muted/20">
                              <AvatarImage
                                src={record.user?.avatar_url}
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
                                {record.user?.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-primary">
                              {record.uid}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{
                                  backgroundColor:
                                    record.exchange?.logo_color || "#6b7280",
                                }}
                              >
                                {record.exchange?.name
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  record.exchange_id.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">
                                {record.exchange?.name || record.exchange_id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                                record.is_active
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-gray-100 text-gray-800 border border-gray-300"
                              }`}
                            >
                              {record.is_active
                                ? t("status.active")
                                : t("status.inactive")}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-muted-foreground">
                            {new Date(record.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
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
                                className="w-48 rounded-none"
                              >
                                <DropdownMenuLabel>
                                  {t("menu.title")}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(record)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("menu.viewDetails")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleViewUser(record)}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  {t("menu.viewUser")}
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
              {currentUidRecords.map((record) => {
                const fullName =
                  record.user?.first_name && record.user?.last_name
                    ? `${record.user.first_name} ${record.user.last_name}`
                    : "Anonymous";

                return (
                  <div
                    key={record.id}
                    className="border border-border/30 rounded-none p-4 space-y-3"
                  >
                    {/* UID Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-muted/20">
                          <AvatarImage
                            src={record.user?.avatar_url}
                            alt={fullName}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                            {fullName.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {record.user?.email}
                          </div>
                          <div className="text-xs font-mono text-primary mt-1">
                            {t("columns.uid")}: {record.uid}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>
                              {t("menu.title")}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(record)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("menu.viewDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewUser(record)}
                            >
                              <User className="mr-2 h-4 w-4" />
                              {t("menu.viewUser")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* UID Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{
                              backgroundColor:
                                record.exchange?.logo_color || "#6b7280",
                            }}
                          >
                            {record.exchange?.name?.charAt(0)?.toUpperCase() ||
                              record.exchange_id.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {record.exchange?.name || record.exchange_id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            record.is_active ? "bg-green-500" : "bg-gray-500"
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            record.is_active
                              ? "text-green-600"
                              : "text-gray-600"
                          }`}
                        >
                          {record.is_active
                            ? t("status.active")
                            : t("status.inactive")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {new Date(record.created_at).toLocaleDateString(
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
          {currentUidRecords.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium mb-2">
                  {t("empty.title")}
                </div>
                <div className="text-sm">{t("empty.subtitle")}</div>
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
              end: Math.min(endIndex, sortedUidRecords.length),
              total: sortedUidRecords.length,
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
                      className="h-8 w-8 p-0"
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
            >
              {t("pagination.next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* UID Details Modal */}
      <Dialog open={isUidModalOpen} onOpenChange={setIsUidModalOpen}>
        <DialogContent className="rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              {tUidDetails("title")}
            </DialogTitle>
            <DialogDescription>{tUidDetails("description")}</DialogDescription>
          </DialogHeader>

          {selectedUid && (
            <div className="space-y-6">
              {/* UID Information */}
              <div className="space-y-4">
                <div className="border border-border rounded-none p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    {tUidDetails("sections.uidInformation")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUidDetails("labels.uid")}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded-none">
                          {selectedUid.uid}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              selectedUid.uid,
                              tUidDetails("labels.uid")
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUidDetails("labels.exchange")}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{
                            backgroundColor:
                              selectedUid.exchange?.logo_color || "#6b7280",
                          }}
                        >
                          {selectedUid.exchange?.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            selectedUid.exchange_id.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">
                          {selectedUid.exchange?.name ||
                            selectedUid.exchange_id}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUidDetails("labels.status")}
                      </label>
                      <div className="mt-1">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                            selectedUid.is_active
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-gray-100 text-gray-800 border border-gray-300"
                          }`}
                        >
                          {selectedUid.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {tUidDetails("status.active")}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              {tUidDetails("status.inactive")}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUidDetails("labels.uidId")}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {selectedUid.id}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              selectedUid.id,
                              tUidDetails("labels.uidId")
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="border border-border rounded-none p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {tUidDetails("sections.timestamps")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUidDetails("labels.created")}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(selectedUid.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUidDetails("labels.lastUpdated")}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(selectedUid.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {tUserDetails("title")}
            </DialogTitle>
            <DialogDescription>{tUserDetails("description")}</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Profile */}
              <div className="flex items-center gap-4 p-4 border border-border rounded-none">
                <Avatar className="h-16 w-16 ring-2 ring-muted/20">
                  <AvatarImage
                    src={selectedUser.user?.avatar_url}
                    alt={`${selectedUser.user?.first_name} ${selectedUser.user?.last_name}`}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-lg">
                    {selectedUser.user?.first_name?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-medium">
                    {selectedUser.user?.first_name &&
                    selectedUser.user?.last_name
                      ? `${selectedUser.user.first_name} ${selectedUser.user.last_name}`
                      : tUserDetails("labels.notProvided")}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedUser.user?.email}
                  </p>
                </div>
              </div>

              {/* User Information */}
              <div className="space-y-4">
                <div className="border border-border rounded-none p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {tUserDetails("sections.userInformation")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUserDetails("labels.firstName")}
                      </label>
                      <p className="text-sm font-medium mt-1">
                        {selectedUser.user?.first_name ||
                          tUserDetails("labels.notProvided")}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        {tUserDetails("labels.lastName")}
                      </label>
                      <p className="text-sm font-medium mt-1">
                        {selectedUser.user?.last_name ||
                          tUserDetails("labels.notProvided")}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-muted-foreground">
                        {tUserDetails("labels.email")}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium">
                          {selectedUser.user?.email ||
                            tUserDetails("labels.notProvided")}
                        </span>
                        {selectedUser.user?.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              copyToClipboard(
                                selectedUser.user?.email || "",
                                tUserDetails("labels.email")
                              )
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-muted-foreground">
                        {tUserDetails("labels.userId")}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {selectedUser.user_id}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              selectedUser.user_id,
                              tUserDetails("labels.userId")
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Associated UIDs */}
                <div className="border border-border rounded-none p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    {tUserDetails("sections.associatedUid")}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-none">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{
                            backgroundColor:
                              selectedUser.exchange?.logo_color || "#6b7280",
                          }}
                        >
                          {selectedUser.exchange?.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            selectedUser.exchange_id.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {selectedUser.exchange?.name ||
                              selectedUser.exchange_id}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {selectedUser.uid}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                            selectedUser.is_active
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-gray-100 text-gray-800 border border-gray-300"
                          }`}
                        >
                          {selectedUser.is_active
                            ? tUserDetails("status.active")
                            : tUserDetails("status.inactive")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
