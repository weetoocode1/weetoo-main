"use client";

import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  AlertTriangle,
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  MoreHorizontal,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BanDialog } from "./ban-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { UserDetailsDialog } from "./user-details-dialog";
import { WarningDialog } from "./warning-dialog";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  nickname?: string;
  mobile_number?: string;
  birth_date?: string | null;
  gender?: string | null;
  identity_verification_name?: string | null;
  role: string;
  kor_coins: number;
  created_at: string;
  updated_at: string;
  warningCount: number;
  avatar_url?: string;
  banned?: boolean;
  ban_reason?: string;
  identity_verified?: boolean;
  identity_verified_at?: string;
  identity_verification_id?: string;
}

export function UserManagementTable() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    "created_at" | "role" | "kor_coins" | "updated_at"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [itemsPerPage] = useState(10);

  // Get current user role for email masking
  const [currentUserRole, setCurrentUserRole] = useState<string>("user");

  // Lightweight UI busy indicator for client-side interactions
  const [isUiBusy, setIsUiBusy] = useState(false);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsUiBusy(true);
    const timer = setTimeout(() => setIsUiBusy(false), 150);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, sortBy, sortOrder, currentPage]);

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "view" | "edit" | "warning" | "ban" | null
  >(null);

  // Form state for editing
  const [, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    role: "",
    kor_coins: 0,
  });

  const {
    data: users,
    isLoading,
    // refetch,
  } = useQuery({
    queryKey: ["admin", "all-users"],
    queryFn: async (): Promise<User[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          nickname,
          mobile_number,
          birth_date,
          gender,
          identity_verification_name,
          role,
          kor_coins,
          created_at,
          avatar_url,
          updated_at,
          banned,
          ban_reason,
          identity_verified,
          identity_verified_at,
          identity_verification_id
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const usersList = data || [];
      if (usersList.length === 0) return [];

      // Fetch warning counts in a single query and aggregate in memory
      const userIds = usersList.map((u) => u.id);
      const { data: warningRowsRaw, error: warningError } = await supabase
        .from("user_warnings")
        .select("user_id")
        .in("user_id", userIds);

      if (warningError) {
        throw warningError;
      }

      const warningRows = (warningRowsRaw ?? []) as Array<{ user_id: string }>;
      const userIdToWarningCount = new Map<string, number>();
      for (const row of warningRows) {
        const existing = userIdToWarningCount.get(row.user_id) || 0;
        userIdToWarningCount.set(row.user_id, existing + 1);
      }

      const usersWithWarnings = usersList.map((u) => ({
        ...u,
        warningCount: userIdToWarningCount.get(u.id) || 0,
      }));

      return usersWithWarnings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
  });

  // Realtime: instantly reflect new/updated users and optimistically update cache
  useEffect(() => {
    const supabase = createClient();

    const upsertUser = (row: User) => {
      if (!row || !row.id) return;
      queryClient.setQueryData(["admin", "all-users"], (oldData: User[]) => {
        const prev: User[] | undefined = oldData as User[] | undefined;
        if (!prev) return prev;
        const index = prev.findIndex((u) => u.id === row.id);
        const normalized: User = {
          ...row,
          warningCount: 0,
        } as User;
        if (index === -1) {
          return [normalized, ...prev];
        }
        const copy = [...prev];
        copy[index] = { ...copy[index], ...normalized };
        return copy;
      });
    };

    const removeUser = (row: User) => {
      if (!row || !row.id) return;
      queryClient.setQueryData(["admin", "all-users"], (oldData: User[]) => {
        const prev: User[] | undefined = oldData as User[] | undefined;
        if (!prev) return prev;
        return prev.filter((u) => u.id !== row.id);
      });
    };

    const channel = supabase
      .channel("admin-users-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "users" },
        (payload: { new: User }) => {
          upsertUser(payload.new);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        (payload: { new: User }) => {
          upsertUser(payload.new);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "users" },
        (payload: { old: Partial<User> }) => {
          removeUser(payload.old as User);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [queryClient]);

  // Filter and sort users
  const filteredUsers =
    users?.filter((user) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    }) || [];

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: number | string | Date = a[sortBy];
    let bValue: number | string | Date = b[sortBy];

    if (sortBy === "created_at" || sortBy === "updated_at") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
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

  const handleSort = (
    field: "created_at" | "role" | "kor_coins" | "updated_at"
  ) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const initializeEditForm = (user: User) => {
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile_number: user.mobile_number || "",
      role: user.role,
      kor_coins: user.kor_coins,
    });
  };

  const getRoleConfig = (role: string) => {
    const configs = {
      user: {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-300",
      },
      admin: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-300",
      },
      super_admin: {
        bg: "bg-purple-100",
        text: "text-purple-800",
        border: "border-purple-300",
      },
    };
    return configs[role as keyof typeof configs] || configs.user;
  };

  const maskEmail = (email: string, userRole: string) => {
    if (userRole === "super_admin") {
      return email;
    }

    const [username, domain] = email.split("@");
    if (username.length <= 2) {
      return email;
    }

    const maskedUsername =
      username.charAt(0) +
      "*".repeat(username.length - 2) +
      username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
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
      const exportData = sortedUsers.map((user) => ({
        "User ID": user.id,
        "First Name": user.first_name,
        "Last Name": user.last_name,
        Email: maskEmail(user.email, currentUserRole),
        Role:
          user.role === "super_admin"
            ? "Super Admin"
            : user.role.charAt(0).toUpperCase() + user.role.slice(1),
        Status: user.banned ? "Banned" : "Active",
        "Ban Reason": user.banned ? user.ban_reason || "N/A" : "N/A",
        Warnings: user.warningCount,
        "KOR Coins": user.kor_coins?.toLocaleString() || "0",
        Mobile: user.mobile_number || "N/A",
        "Identity Verified": user.identity_verified ? "Yes" : "No",
        "Verification Date": user.identity_verified_at
          ? formatDateForCsv(user.identity_verified_at)
          : "N/A",
        Created: formatDateForCsv(user.created_at),
        "Last Updated": formatDateForCsv(user.updated_at),
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
        `users-export-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${exportData.length} users to CSV!`);
    } catch (_error) {
      console.error("Export failed:", _error);
      toast.error("Failed to export users. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerifyIdentity = async (user: User) => {
    try {
      const supabase = createClient();

      if (user.identity_verified) {
        // Unverify the user
        const { error } = await supabase
          .from("users")
          .update({
            identity_verified: false,
            identity_verified_at: null,
            identity_verification_id: null,
          })
          .eq("id", user.id);

        if (error) {
          throw error;
        }

        toast.success(
          `Successfully unverified identity for ${user.first_name} ${user.last_name}`
        );

        // Dispatch event to instantly update all restrictions across the app
        window.dispatchEvent(
          new CustomEvent("identity-verified", {
            detail: {
              userId: user.id,
              data: {
                id: null,
              },
            },
          })
        );
      } else {
        // Get current admin user ID
        const {
          data: { user: adminUser },
        } = await supabase.auth.getUser();
        const adminUserId = adminUser?.id || "unknown";

        // Verify the user
        const { error } = await supabase
          .from("users")
          .update({
            identity_verified: true,
            identity_verified_at: new Date().toISOString(),
            identity_verification_id: `admin_verified_${adminUserId}`,
          })
          .eq("id", user.id);

        if (error) {
          throw error;
        }

        toast.success(
          `Successfully verified identity for ${user.first_name} ${user.last_name}`
        );

        // Dispatch event to instantly update all restrictions across the app
        window.dispatchEvent(
          new CustomEvent("identity-verified", {
            detail: {
              userId: user.id,
              data: {
                id: `admin_verified_${adminUserId}`,
              },
            },
          })
        );
      }

      // Refresh the users data
      queryClient.invalidateQueries({
        queryKey: ["admin", "all-users"],
      });
    } catch (_error) {
      console.error("Failed to update identity verification:", _error);
      toast.error(
        "Failed to update user identity verification. Please try again."
      );
    }
  };

  useEffect(() => {
    if (openDialog === "edit" && selectedUser) {
      initializeEditForm(selectedUser);
    }
  }, [openDialog, selectedUser]);

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

  // Get current user role
  useEffect(() => {
    const getCurrentUserRole = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userData) {
          setCurrentUserRole(userData.role);
        }
      }
    };

    getCurrentUserRole();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-10">
        {/* Search and Filters Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-64" />
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
            placeholder="Search users... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64 shadow-none rounded-none h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32 shadow-none rounded-none h-10">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
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
                Export
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
                        User
                        <span className="text-muted-foreground">
                          {sortBy === "created_at"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort("role")}
                        className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider hover:text-primary transition-colors"
                      >
                        Role
                        <span className="text-muted-foreground">
                          {sortBy === "role"
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    </th>

                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      KOR Coins
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Warnings
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Identity
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => {
                    const fullName =
                      user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : "Anonymous";
                    const roleConfig = getRoleConfig(user.role);

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
                                {fullName.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium text-sm truncate">
                                {fullName}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {maskEmail(user.email, currentUserRole)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border} border`}
                            >
                              {user.role === "super_admin"
                                ? "Super Admin"
                                : user.role.charAt(0).toUpperCase() +
                                  user.role.slice(1)}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Icons.coins className="h-4 w-4 text-yellow-600" />
                            <span className="font-mono font-medium text-sm">
                              {user.kor_coins?.toLocaleString() || "0"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="font-mono font-medium text-sm">
                              {user.warningCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                                user.identity_verified
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {user.identity_verified
                                ? "Verified"
                                : "Unverified"}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-none"
                              >
                                <DropdownMenuLabel>
                                  User Actions
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setOpenDialog("view");
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    initializeEditForm(user);
                                    setOpenDialog("edit");
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setOpenDialog("warning");
                                  }}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  <AlertTriangle className="mr-2 h-4 w-4" />
                                  Issue Warning
                                </DropdownMenuItem>
                                {currentUserRole === "super_admin" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setOpenDialog("ban");
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    {user.banned ? "Unban User" : "Ban User"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleVerifyIdentity(user)}
                                  className="text-blue-600 focus:text-blue-600"
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  {user.identity_verified
                                    ? "Unverify Identity"
                                    : "Verify Identity"}
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
                  user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : "Anonymous";
                const roleConfig = getRoleConfig(user.role);

                return (
                  <div
                    key={user.id}
                    className="border border-border/30 rounded-none p-4 space-y-3"
                  >
                    {/* User Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-muted/20">
                          <AvatarImage src={user.avatar_url} alt={fullName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
                            {fullName.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {maskEmail(user.email, currentUserRole)}
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
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setOpenDialog("view");
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                initializeEditForm(user);
                                setOpenDialog("edit");
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setOpenDialog("warning");
                              }}
                              className="text-orange-600 focus:text-orange-600"
                            >
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Issue Warning
                            </DropdownMenuItem>
                            {currentUserRole === "super_admin" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setOpenDialog("ban");
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                {user.banned ? "Unban User" : "Ban User"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleVerifyIdentity(user)}
                              className="text-blue-600 focus:text-blue-600"
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {user.identity_verified
                                ? "Unverify Identity"
                                : "Verify Identity"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <div
                            className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border} border`}
                          >
                            {user.role === "super_admin"
                              ? "Super Admin"
                              : user.role.charAt(0).toUpperCase() +
                                user.role.slice(1)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.banned ? "bg-red-500" : "bg-green-500"
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            user.banned ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {user.banned ? "Banned" : "Active"}
                        </span>
                      </div>
                      {user.banned && user.ban_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          Reason: {user.ban_reason}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Icons.coins className="h-4 w-4 text-yellow-600" />
                        <span className="font-mono font-medium">
                          {user.kor_coins?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-mono font-medium">
                          {user.warningCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${
                            user.identity_verified
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                          }`}
                        >
                          {user.identity_verified ? "Verified" : "Unverified"}
                        </div>
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
                <div className="text-lg font-medium mb-2">No users found</div>
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
            Showing {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)} of{" "}
            {sortedUsers.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
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
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {selectedUser && (
        <>
          {/* View Details Dialog */}
          {openDialog === "view" && (
            <UserDetailsDialog
              user={selectedUser}
              open={openDialog === "view"}
              onOpenChange={(open: boolean) =>
                setOpenDialog(open ? "view" : null)
              }
            />
          )}

          {/* Edit User Dialog */}
          {openDialog === "edit" && (
            <EditUserDialog
              user={selectedUser}
              open={openDialog === "edit"}
              onOpenChange={(open) => setOpenDialog(open ? "edit" : null)}
              onUserUpdated={() => {
                setOpenDialog(null);
                queryClient.invalidateQueries({
                  queryKey: ["admin", "all-users"],
                });
              }}
              currentUserRole={currentUserRole}
            />
          )}

          {/* Issue Warning Dialog */}
          {openDialog === "warning" && (
            <WarningDialog
              user={{
                id: selectedUser.id,
                first_name: selectedUser.first_name,
                last_name: selectedUser.last_name,
                email: selectedUser.email,
                warningCount: selectedUser.warningCount,
                avatar_url: selectedUser.avatar_url,
              }}
              open={openDialog === "warning"}
              onOpenChange={(open) => setOpenDialog(open ? "warning" : null)}
              onWarningIssued={() => {
                setOpenDialog(null);
                queryClient.invalidateQueries({
                  queryKey: ["admin", "all-users"],
                });
              }}
            />
          )}

          {/* Ban Dialog */}
          {openDialog === "ban" && (
            <BanDialog
              user={selectedUser}
              open={openDialog === "ban"}
              onOpenChange={(open) => setOpenDialog(open ? "ban" : null)}
              onUserBanned={() => {
                setOpenDialog(null);
                queryClient.invalidateQueries({
                  queryKey: ["admin", "all-users"],
                });
              }}
              currentUserRole={currentUserRole}
            />
          )}
        </>
      )}
    </div>
  );
}
