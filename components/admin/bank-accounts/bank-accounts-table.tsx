"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EditBankAccountDialog } from "./edit-bank-account-dialog";
import { DeleteBankAccountDialog } from "./delete-bank-account-dialog";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BankAccountsTableProps {
  onAddAccount: () => void;
}

export function BankAccountsTable({ onAddAccount }: BankAccountsTableProps) {
  const t = useTranslations("admin.bankAccounts.table");
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    "created_at" | "bank_name" | "is_primary"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage] = useState(10);

  // Lightweight UI busy indicator for client-side interactions
  const [isUiBusy, setIsUiBusy] = useState(false);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Dialog states
  const [selectedBankAccount, setSelectedBankAccount] =
    useState<BankAccount | null>(null);
  const [openDialog, setOpenDialog] = useState<"edit" | "delete" | null>(null);

  useEffect(() => {
    setIsUiBusy(true);
    const timer = setTimeout(() => setIsUiBusy(false), 150);
    return () => clearTimeout(timer);
  }, [sortBy, sortOrder, currentPage]);

  // Fetch bank accounts
  const { data: bankAccounts, isLoading } = useQuery({
    queryKey: ["admin", "bank-accounts"],
    queryFn: async (): Promise<BankAccount[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("admin_bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const setPrimaryBankAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();

      // First, remove primary from all accounts
      await supabase
        .from("admin_bank_accounts")
        .update({ is_primary: false })
        .eq("is_primary", true);

      // Then set the selected account as primary
      const { error } = await supabase
        .from("admin_bank_accounts")
        .update({ is_primary: true })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bank-accounts"] });
      toast.success(t("messages.primaryUpdated"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("messages.primaryUpdateFailed"));
    },
  });

  // Filter and sort bank accounts
  const filteredBankAccounts =
    bankAccounts?.filter((account) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        account.bank_name?.toLowerCase().includes(searchLower) ||
        account.account_number?.includes(searchTerm) ||
        account.account_holder?.toLowerCase().includes(searchLower);

      return matchesSearch;
    }) || [];

  const sortedBankAccounts = [...filteredBankAccounts].sort((a, b) => {
    if (sortBy === "created_at") {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    }

    if (sortBy === "bank_name") {
      const aName = a.bank_name.toLowerCase();
      const bName = b.bank_name.toLowerCase();
      return sortOrder === "asc"
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }

    if (sortBy === "is_primary") {
      // Primary accounts first, then secondary
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    }

    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedBankAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBankAccounts = sortedBankAccounts.slice(startIndex, endIndex);

  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0 shadow-none rounded-none"
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </Button>
        );
      }
    } else {
      // Show first page
      buttons.push(
        <Button
          key={1}
          variant={currentPage === 1 ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0 shadow-none rounded-none"
          onClick={() => setCurrentPage(1)}
        >
          1
        </Button>
      );

      // Show ellipsis if needed
      if (currentPage > 3) {
        buttons.push(
          <span key="ellipsis1" className="px-2 text-muted-foreground">
            ...
          </span>
        );
      }

      // Show pages around current page
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        if (i > 1 && i < totalPages) {
          buttons.push(
            <Button
              key={i}
              variant={currentPage === i ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0 shadow-none rounded-none"
              onClick={() => setCurrentPage(i)}
            >
              {i}
            </Button>
          );
        }
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis2" className="px-2 text-muted-foreground">
            ...
          </span>
        );
      }

      // Show last page
      if (totalPages > 1) {
        buttons.push(
          <Button
            key={totalPages}
            variant={currentPage === totalPages ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0 shadow-none rounded-none"
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </Button>
        );
      }
    }

    return buttons;
  };

  const handleSort = (field: "created_at" | "bank_name" | "is_primary") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleDeleteBankAccount = async (account: BankAccount) => {
    if (account.is_primary) {
      toast.error(t("messages.cannotDeletePrimary"));
      return;
    }

    setSelectedBankAccount(account);
    setOpenDialog("delete");
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

      // Escape: Clear search and close dialogs
      if (e.key === "Escape") {
        if (searchTerm) {
          setSearchTerm("");
        }
        if (openDialog) {
          setOpenDialog(null);
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm, openDialog]);

  if (isLoading) {
    return (
      <div className="space-y-3 ">
        {/* Search and Filters Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
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
    <div className="space-y-3 ">
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
          <Button
            onClick={onAddAccount}
            className="bg-primary hover:bg-primary/90 rounded-none"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("addButton")}
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
                        onClick={() => handleSort("bank_name")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.bankAccount")}
                        <span className="text-muted-foreground">
                          {sortBy === "bank_name"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("columns.accountDetails")}
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort("is_primary")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        {t("columns.status")}
                        <span className="text-muted-foreground">
                          {sortBy === "is_primary"
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
                  {currentBankAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-muted/20">
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                              <Building2 className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-sm truncate">
                              {account.bank_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {account.account_holder}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-medium">
                            {account.account_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("labels.accountNumber")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {account.is_primary ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-medium">
                              <Star className="h-3 w-3" />
                              <span>{t("status.primary")}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium">
                              <span>{t("status.secondary")}</span>
                            </div>
                          )}
                          {!account.is_active && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
                              <span>{t("status.inactive")}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(account.created_at).toLocaleDateString(
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
                              className="w-48 rounded-none"
                            >
                              <DropdownMenuLabel>
                                {t("menu.title")}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBankAccount(account);
                                  setOpenDialog("edit");
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                {t("menu.editAccount")}
                              </DropdownMenuItem>
                              {!account.is_primary && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setPrimaryBankAccountMutation.mutateAsync(
                                        account.id
                                      )
                                    }
                                    className="text-yellow-600 focus:text-yellow-600"
                                  >
                                    <Star className="mr-2 h-4 w-4" />
                                    {t("menu.setAsPrimary")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteBankAccount(account)
                                    }
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("menu.deleteAccount")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              {currentBankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="border border-border/30 rounded-none p-4 space-y-3"
                >
                  {/* Bank Account Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-muted/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                          <Building2 className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {account.bank_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {account.account_holder}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.is_primary ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-medium">
                          <Star className="h-3 w-3" />
                          <span>{t("status.primary")}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium">
                          <span>{t("status.secondary")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bank Account Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t("mobile.accountNumber")}
                        </div>
                        <div className="font-mono font-medium">
                          {account.account_number}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t("mobile.created")}
                        </div>
                        <div className="font-medium">
                          {new Date(account.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t("menu.open")}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>
                            {t("menu.title")}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBankAccount(account);
                              setOpenDialog("edit");
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {t("menu.editAccount")}
                          </DropdownMenuItem>
                          {!account.is_primary && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setPrimaryBankAccountMutation.mutateAsync(
                                    account.id
                                  )
                                }
                                className="text-yellow-600 focus:text-yellow-600"
                              >
                                <Star className="mr-2 h-4 w-4" />
                                {t("menu.setAsPrimary")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteBankAccount(account)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("menu.deleteAccount")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No Results */}
          {currentBankAccounts.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium mb-2">
                  {t("empty.title")}
                </div>
                <div className="text-sm">
                  {searchTerm ? t("empty.searchSubtitle") : t("empty.subtitle")}
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
              end: Math.min(endIndex, sortedBankAccounts.length),
              total: sortedBankAccounts.length,
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
              {generatePaginationButtons()}
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
      {selectedBankAccount && (
        <>
          {/* Edit Bank Account Dialog */}
          {openDialog === "edit" && (
            <EditBankAccountDialog
              bankAccount={selectedBankAccount}
              open={openDialog === "edit"}
              onOpenChange={(open) => setOpenDialog(open ? "edit" : null)}
              onBankAccountUpdated={() => {
                setOpenDialog(null);
                setSelectedBankAccount(null);
                queryClient.invalidateQueries({
                  queryKey: ["admin", "bank-accounts"],
                });
              }}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <DeleteBankAccountDialog
            bankAccount={selectedBankAccount}
            open={openDialog === "delete"}
            onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}
            onDeleted={() => {
              setOpenDialog(null);
              setSelectedBankAccount(null);
            }}
          />
        </>
      )}
    </div>
  );
}
