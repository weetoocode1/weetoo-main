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
  useAdminDepositRealtimeSubscriptions,
  useAllDepositRequests,
} from "@/hooks/use-deposit";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Search, Shield, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  is_verified: boolean;
}

interface DepositRequest {
  id: string;
  user_id: string;
  bank_account_id: string;
  kor_coins_amount: number;
  won_amount: number;
  vat_amount: number;
  total_amount: number;
  status: string;
  payment_reference?: string | null;
  payment_status?: string | null;
  created_at: string;
  updated_at: string;
  bank_account: BankAccount;
  user: {
    first_name: string;
    last_name: string;
    email?: string | null;
    level?: number;
    avatar_url?: string | null;
  };
}

export function DepositTable() {
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
  const queryClient = useQueryClient();

  // Enable realtime invalidation for deposits
  useAdminDepositRealtimeSubscriptions();

  // Source data via TanStack Query
  const { data: queryData, isLoading: loading } = useAllDepositRequests();
  const deposits = (queryData as unknown as DepositRequest[]) || [];

  // Mutations
  const sendKorCoinsMutation = useMutation({
    mutationFn: async (depositId: string) => {
      // Call secure API to complete the deposit and credit coins
      const res = await fetch("/api/secure-financial/deposit/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to complete deposit");
      }
      return depositId;
    },
    onSuccess: () => {
      // Invalidate deposit query keys (provided by use-deposit.ts)
      queryClient.invalidateQueries({ queryKey: ["deposit", "list"] });
      toast.success("KOR coins sent successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send KOR coins");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = createClient();
      // Only update non-completed statuses here; completed is handled by secure API
      const { error } = await supabase
        .from("deposit_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposit", "list"] });
      toast.success("Status updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleFilterChange = (
    key: Exclude<keyof typeof filters, "dateRange">,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Event handlers
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
      return value.from || value.to;
    }
    return value !== "all";
  }).length;

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

  // Filter requests based on search term and filters
  const filteredRequests = deposits.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    const userName = `${request.user?.first_name || ""} ${
      request.user?.last_name || ""
    }`
      .trim()
      .toLowerCase();
    const bankName = (request.bank_account?.bank_name || "").toLowerCase();
    const paymentRef = (request.payment_reference || "").toLowerCase();

    const matchesSearch =
      userName.includes(searchLower) ||
      bankName.includes(searchLower) ||
      paymentRef.includes(searchLower);

    const matchesStatus =
      filters.status === "all" || request.status === filters.status;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
            <Clock className="h-3 w-3" />
            <span className="uppercase tracking-wide">Pending</span>
          </div>
        );
      case "completed":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <CheckCircle className="h-3 w-3" />
            <span className="uppercase tracking-wide">Completed</span>
          </div>
        );
      case "failed":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <XIcon className="h-3 w-3" />
            <span className="uppercase tracking-wide">Failed</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            <span className="uppercase tracking-wide">{status}</span>
          </div>
        );
    }
  };

  // Handle status change
  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "completed") {
      try {
        await sendKorCoinsMutation.mutateAsync(id);
      } catch {}
      return;
    }

    if (newStatus === "failed") {
      try {
        await fetch("/api/secure-financial/deposit/fail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ depositId: id }),
        }).then(async (res) => {
          if (!res.ok)
            throw new Error(
              (await res.json())?.error || "Failed to mark as failed"
            );
        });
        queryClient.invalidateQueries({ queryKey: ["deposit", "list"] });
        toast.success("Marked as failed");
      } catch (e: unknown) {
        toast.error(
          e instanceof Error ? e.message : "Failed to mark as failed"
        );
      }
      return;
    }

    await updateStatusMutation.mutateAsync({ id, status: newStatus });
  };

  // Handle send KOR coins
  // const handleSendKorCoins = async (id: string) => {
  //   await sendKorCoinsMutation.mutateAsync(id);
  // };

  const exportCsv = () => {
    try {
      const csvRows = deposits.map((r) => ({
        id: r.id,
        accountHolderName: `${r.user?.first_name || ""} ${
          r.user?.last_name || ""
        }`.trim(),
        accountNumber: r.bank_account?.account_number || "",
        bankName: r.bank_account?.bank_name || "",
        korCoinsAmount: r.kor_coins_amount,
        wonAmount: r.total_amount,
        status: r.status === "rejected" ? "failed" : r.status, // Map old status to new
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
      a.download = `deposits-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_error) {
      toast.error("Failed to export CSV");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 mt-10">
        <div className="border border-border rounded-none">
          <div className="p-8 text-center">
            <div className="text-muted-foreground">
              Loading deposit requests...
            </div>
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
            placeholder="Search by user name, email, or deposit ID... (Ctrl+F)"
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
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="shadow-none rounded-none h-10"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Clear ({activeFilterCount})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="shadow-none rounded-none h-10"
            onClick={exportCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      KOR Coins
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Won Amount
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Bank Details
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Payment Reference
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Status & Actions
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
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-muted/20">
                            <AvatarImage
                              src={request.user?.avatar_url || undefined}
                              alt={`${request.user?.first_name} ${request.user?.last_name}`}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                              {`${request.user?.first_name || ""} ${
                                request.user?.last_name || ""
                              }`
                                .trim()
                                .split(" ")
                                .map((part) => part.charAt(0))
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-sm truncate">
                              {`${request.user?.first_name || ""} ${
                                request.user?.last_name || ""
                              }`.trim() || "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Level {request.user?.level || 0}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold text-green-600">
                          {request.kor_coins_amount.toLocaleString()} KOR
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold text-blue-600">
                          ₩{request.total_amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Base: ₩{request.won_amount.toLocaleString()} + VAT: ₩
                          {request.vat_amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {request.bank_account?.bank_name || "Unknown Bank"}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {request.bank_account?.account_number ||
                              "No Account Number"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm bg-muted/60 px-2 py-1 rounded border">
                          {request.payment_reference || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Select
                            value={request.status}
                            onValueChange={(newStatus) =>
                              handleStatusChange(request.id, newStatus)
                            }
                            disabled={
                              request.status === "completed" ||
                              request.status === "failed"
                            }
                          >
                            <SelectTrigger className="w-full shadow-none rounded-none h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="completed">
                                Completed
                              </SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Show status indicator for completed deposits */}
                          {request.status === "completed" && (
                            <div className="flex items-center gap-2">
                              {request.payment_status === "completed" ? (
                                <div className="text-sm text-green-600 font-medium">
                                  ✓ KOR Coins Sent
                                </div>
                              ) : (
                                <div className="text-sm text-blue-600 font-medium">
                                  ⏳ Processing...
                                </div>
                              )}
                            </div>
                          )}

                          {/* Note: KOR coins are sent automatically when status changes to completed */}
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
                          src={request.user?.avatar_url || undefined}
                          alt={`${request.user?.first_name} ${request.user?.last_name}`}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                          {`${request.user?.first_name || ""} ${
                            request.user?.last_name || ""
                          }`
                            .trim()
                            .split(" ")
                            .map((part) => part.charAt(0))
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {`${request.user?.first_name || ""} ${
                            request.user?.last_name || ""
                          }`.trim() || "Unknown User"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Payment Ref: {request.payment_reference} • Level{" "}
                          {request.user?.level || 0}
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
                          KOR Coins
                        </div>
                        <div className="font-medium text-sm">
                          {request.kor_coins_amount.toLocaleString()} KOR
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Won Amount
                        </div>
                        <div className="font-medium text-sm">
                          ₩{request.total_amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Bank
                        </div>
                        <div className="font-medium text-sm">
                          {request.bank_account?.bank_name || "Unknown Bank"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Account Number
                        </div>
                        <div className="font-mono text-sm">
                          {request.bank_account?.account_number ||
                            "No Account Number"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Reference for Mobile */}
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        Payment Reference
                      </div>
                      <div className="font-mono text-sm font-medium">
                        {request.payment_reference || "-"}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Status Change */}
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Change Status:
                      </span>
                      <Select
                        value={request.status}
                        onValueChange={(newStatus) =>
                          handleStatusChange(request.id, newStatus)
                        }
                      >
                        <SelectTrigger className="w-32 shadow-none rounded-none h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
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
                  No deposit requests found
                </div>
                <div className="text-sm">
                  Try adjusting your search criteria
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
            Showing {startIndex + 1}-
            {Math.min(endIndex, filteredRequests.length)} of{" "}
            {filteredRequests.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="shadow-none rounded-none h-10"
            >
              Previous
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
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
