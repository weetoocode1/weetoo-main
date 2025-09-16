"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAllWithdrawalRequests,
  useSetPayoutSent,
  useUpdateWithdrawalStatus,
} from "@/hooks/use-withdrawal";
import type { WithdrawalRequest as DbWithdrawalRequest } from "@/types/withdrawal";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Search,
  Shield,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface WithdrawRequest {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  bankName?: string;
  verificationAmount?: number | null;
  status: "pending" | "sent" | "verified" | "failed";
  userLevel: number;
  withdrawalAmount: number; // KOR coins user wants to withdraw
  avatarUrl?: string;
  payout_sent?: boolean; // Add this field for UI state
}

// Interface for the raw database data structure
interface RawWithdrawalData {
  id: string;
  status: string;
  kor_coins_amount: number;
  created_at: string;
  bank_account?: {
    id?: string;
    account_holder_name?: string;
    account_number?: string;
    bank_name?: string;
    verification_amount?: string | number | null;
  };
  user?: {
    first_name?: string;
    last_name?: string;
    level?: number;
    avatar_url?: string;
  };
  payout_sent?: boolean;
}

export function WithdrawTable() {
  const t = useTranslations("admin.withdrawManagement.table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
    amountRange: "all",
  });

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { data: dbRequests, isLoading } = useAllWithdrawalRequests();
  const updateStatusMutation = useUpdateWithdrawalStatus();
  const setPayoutSent = useSetPayoutSent();

  const mapUiStatusToDb = (
    s: WithdrawRequest["status"]
  ): DbWithdrawalRequest["status"] => {
    if (s === "verified") return "verified";
    if (s === "failed") return "failed";
    return "pending";
  };

  // const handleDateRangeChange = (range: DateRange | undefined) => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     dateRange: { from: range?.from, to: range?.to },
  //   }));
  // };

  const handleFilterChange = (
    key: Exclude<keyof typeof filters, "dateRange">,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Event handlers (avoid inline functionality in JSX)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    handleFilterChange("status", value);
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      dateRange: {
        from: undefined,
        to: undefined,
      },
      amountRange: "all",
    });
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((value) => {
    if (typeof value === "object" && value !== null) {
      // Handle dateRange object
      return value.from || value.to;
    }
    return value !== "all";
  }).length;

  // Calculate withdrawal fee based on user level
  const calculateWithdrawalFee = (level: number, amount: number) => {
    let feePercentage = 40; // Default for level 1-25

    if (level >= 76 && level <= 99) {
      feePercentage = 10; // Platinum
    } else if (level >= 51 && level <= 75) {
      feePercentage = 20; // Gold
    } else if (level >= 26 && level <= 50) {
      feePercentage = 30; // Silver
    }
    // Level 1-25 stays at 40% (Bronze)

    const feeAmount = (amount * feePercentage) / 100;
    const finalAmount = amount - feeAmount;

    return {
      feePercentage,
      feeAmount,
      finalAmount,
      tier:
        level <= 25
          ? "Bronze"
          : level <= 50
          ? "Silver"
          : level <= 75
          ? "Gold"
          : "Platinum",
    };
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
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  // Map DB rows into view-model rows used by this table
  const withdrawRequests: WithdrawRequest[] = (dbRequests || []).map(
    (r: RawWithdrawalData) => {
      // Map DB status to UI status values
      const mapStatus = (
        s: RawWithdrawalData["status"]
      ): WithdrawRequest["status"] => {
        if (s === "verified" || s === "approved" || s === "completed")
          return "verified";
        if (s === "failed" || s === "rejected") return "failed";
        return "pending";
      };

      return {
        id: r.id,
        accountHolderName:
          r.bank_account?.account_holder_name || r.user?.first_name || "-",
        accountNumber: r.bank_account?.account_number || "-",
        bankName: r.bank_account?.bank_name || "-",
        verificationAmount: (() => {
          const amount = r.bank_account?.verification_amount;
          if (amount == null) return null;
          if (typeof amount === "string") return parseFloat(amount);
          if (typeof amount === "number") return amount;
          return null;
        })(),
        status: mapStatus(r.status),
        userLevel: r.user?.level || 0,
        withdrawalAmount: r.kor_coins_amount || 0,
        avatarUrl: (r as RawWithdrawalData).user?.avatar_url || undefined,
        // carry payout flag for UI acknowledgement
        ...((r as RawWithdrawalData).payout_sent !== undefined
          ? { payout_sent: (r as RawWithdrawalData).payout_sent }
          : {}),
      };
    }
  );

  // Filter requests based on search term and filters
  const filteredRequests = withdrawRequests.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      request.accountHolderName.toLowerCase().includes(searchLower) ||
      request.accountNumber.includes(searchLower) ||
      request.id.includes(searchLower);

    const matchesStatus =
      filters.status === "all" || request.status === filters.status;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const getStatusBadge = (status: WithdrawRequest["status"]) => {
    switch (status) {
      case "pending":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
            <Clock className="h-3 w-3" />
            <span className="uppercase tracking-wide">
              {t("status.pending")}
            </span>
          </div>
        );
      case "sent":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <CreditCard className="h-3 w-3" />
            <span className="uppercase tracking-wide">{t("status.sent")}</span>
          </div>
        );
      case "verified":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <CheckCircle className="h-3 w-3" />
            <span className="uppercase tracking-wide">
              {t("status.verified")}
            </span>
          </div>
        );
      case "failed":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <AlertTriangle className="h-3 w-3" />
            <span className="uppercase tracking-wide">
              {t("status.failed")}
            </span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            <span className="uppercase tracking-wide">
              {t("status.unknown")}
            </span>
          </div>
        );
    }
  };

  const handleStatusChange = (
    id: string,
    newStatus: WithdrawRequest["status"]
  ) => {
    updateStatusMutation.mutate(
      { id, data: { status: mapUiStatusToDb(newStatus) } },
      {
        onSuccess: () => {
          toast.success(t("messages.statusUpdated"));
        },
        onError: (err: Error | unknown) => {
          const errorMessage =
            err instanceof Error
              ? err.message
              : t("messages.statusUpdateFailed");
          toast.error(errorMessage);
        },
      }
    );
  };

  const getRowStatusChangeHandler =
    (id: string) => (newStatus: WithdrawRequest["status"]) =>
      handleStatusChange(id, newStatus);

  const handleMarkAsSent = (id: string) => {
    setPayoutSent.mutate({ id, sent: true });
  };

  const exportCsv = () => {
    try {
      const csvRows = (dbRequests || []).map((r) => ({
        id: r.id,
        accountHolderName:
          r.bank_account?.account_holder_name || r.user?.first_name || "-",
        accountNumber: r.bank_account?.account_number || "-",
        bankName: r.bank_account?.bank_name || "-",
        withdrawalAmount: r.kor_coins_amount || 0,
        status: r.status,
        created_at: r.created_at,
      }));
      if (csvRows.length === 0) return;
      const headers = Object.keys(csvRows[0]);
      const csv = [
        headers.join(","),
        ...csvRows.map((row) =>
          headers
            .map((h) => {
              const v = row[h as keyof typeof row] ?? "";
              if (
                typeof v === "string" &&
                (v.includes(",") || v.includes('"'))
              ) {
                return '"' + v.replace(/"/g, '""') + '"';
              }
              return v;
            })
            .join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `withdrawals-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-10">
        <div className="border border-border rounded-none">
          <div className="p-8 text-center">
            <div className="text-muted-foreground">{t("loading")}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-10">
      {/* Search, Filters, Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 w-64 shadow-none rounded-none h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filters.status}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-32 shadow-none rounded-none h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("statusFilter.all")}</SelectItem>
              <SelectItem value="pending">
                {t("statusFilter.pending")}
              </SelectItem>
              <SelectItem value="verified">
                {t("statusFilter.verified")}
              </SelectItem>
              <SelectItem value="failed">{t("statusFilter.failed")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Removed All Methods filter as functionality is unnecessary */}

          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="shadow-none rounded-none h-10"
            >
              <XIcon className="h-4 w-4 mr-2" />
              {t("clearFilters")} ({activeFilterCount})
            </Button>
          )}
          {/* Export CSV moved here */}
          <Button
            variant="outline"
            size="sm"
            className="shadow-none rounded-none h-10"
            onClick={exportCsv}
          >
            {t("exportCsv")}
          </Button>
        </div>
      </div>

      {/* Send Money Dialog */}
      {/* Removed SendMoneyDialog import, so this component is no longer used */}

      {/* Custom Table - Following admin design */}
      <div className="relative" ref={tableRef}>
        <div className="border border-border rounded-none">
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.id")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.user")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.korCoins")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.bankDetails")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.verificationWithdrawal")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.status")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm">{request.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-muted/20">
                            <AvatarImage
                              src={request.avatarUrl}
                              alt={request.accountHolderName}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                              {request.accountHolderName
                                .split(" ")
                                .map((part) => part.charAt(0))
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-sm truncate">
                              {request.accountHolderName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Level {request.userLevel}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold text-green-600">
                          {request.withdrawalAmount.toLocaleString()} KOR
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {request.bankName}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {request.accountNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-center">
                          {request.status === "verified" ? (
                            // For verified: just show the final amount to send
                            <div className="text-lg font-bold text-green-600">
                              ₩
                              {calculateWithdrawalFee(
                                request.userLevel,
                                request.withdrawalAmount
                              ).finalAmount.toLocaleString()}
                            </div>
                          ) : (
                            // For pending/sent: just show verification amount
                            <div className="text-lg font-bold text-blue-600">
                              {typeof request.verificationAmount === "number"
                                ? `₩${request.verificationAmount.toFixed(4)}`
                                : "-"}
                            </div>
                          )}
                          {request.status === "verified" &&
                            (request as WithdrawRequest).payout_sent && (
                              <div className="mt-1 text-xs text-emerald-600 font-medium">
                                {t("actions.sent")}
                              </div>
                            )}
                          {request.status === "verified" &&
                            !(request as WithdrawRequest).payout_sent && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {t("actions.afterSending")}
                              </div>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Select
                            value={request.status}
                            onValueChange={getRowStatusChangeHandler(
                              request.id
                            )}
                            disabled={request.status === "failed"}
                          >
                            <SelectTrigger className="w-full shadow-none rounded-none h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                {t("status.pending")}
                              </SelectItem>
                              <SelectItem value="verified">
                                {t("status.verified")}
                              </SelectItem>
                              <SelectItem value="failed">
                                {t("status.failed")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {request.status === "verified" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 rounded-none"
                              onClick={() => handleMarkAsSent(request.id)}
                              disabled={
                                (request as WithdrawRequest).payout_sent ===
                                true
                              }
                            >
                              {(request as WithdrawRequest).payout_sent
                                ? t("actions.sent")
                                : t("actions.markAsSent")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <div className="space-y-4 p-4">
              {currentRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-border/30 rounded-none p-4 space-y-3"
                >
                  {/* Request Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-muted/20">
                        <AvatarImage
                          src={request.avatarUrl}
                          alt={request.accountHolderName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                          {request.accountHolderName
                            .split(" ")
                            .map((part) => part.charAt(0))
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {request.accountHolderName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {request.id} • {t("mobile.level")}{" "}
                          {request.userLevel}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t("mobile.korCoins")}
                        </div>
                        <div className="font-medium text-sm">
                          {request.withdrawalAmount.toLocaleString()} KOR
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t("mobile.accountNumber")}
                        </div>
                        <div className="font-mono text-sm">
                          {request.accountNumber}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t("mobile.verificationAmount")}
                        </div>
                        <div className="font-mono font-medium">
                          <span className="text-sm">₩</span>{" "}
                          {typeof request.verificationAmount === "number"
                            ? request.verificationAmount.toFixed(4)
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simple Fee Breakdown for Mobile */}
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    {request.status === "verified" ? (
                      // For verified: just show final amount
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {t("mobile.send")} ₩
                          {calculateWithdrawalFee(
                            request.userLevel,
                            request.withdrawalAmount
                          ).finalAmount.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      // For pending/sent: just show verification amount
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {typeof request.verificationAmount === "number"
                            ? `${t(
                                "mobile.send"
                              )} ₩${request.verificationAmount.toFixed(4)}`
                            : `${t("mobile.send")} -`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Status Change */}
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t("actions.changeStatus")}
                      </span>
                      <Select
                        value={request.status}
                        onValueChange={(newStatus) =>
                          handleStatusChange(
                            request.id,
                            newStatus as WithdrawRequest["status"]
                          )
                        }
                      >
                        <SelectTrigger className="w-32 shadow-none rounded-none h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            {t("status.pending")}
                          </SelectItem>
                          <SelectItem value="verified">
                            {t("status.verified")}
                          </SelectItem>
                          <SelectItem value="failed">
                            {t("status.failed")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No Results */}
          {currentRequests.length === 0 && (
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
              end: Math.min(endIndex, filteredRequests.length),
              total: filteredRequests.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="shadow-none rounded-none h-10"
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
                      className="h-8 w-8 p-0 shadow-none rounded-none"
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
              className="shadow-none rounded-none h-10"
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
