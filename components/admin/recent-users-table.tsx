"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

interface RecentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  kor_coins: number;
  created_at: string;
  avatar_url?: string;
}

const columns: ColumnDef<RecentUser>[] = [
  {
    accessorKey: "first_name",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      const fullName =
        user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : "Anonymous";
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-muted/20">
            <AvatarImage src={user.avatar_url} alt={fullName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium">
              {fullName.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-medium text-sm truncate">{fullName}</span>
            <span className="text-xs text-muted-foreground truncate">
              {user.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const roleConfig = {
        admin: {
          bg: "bg-red-100",
          text: "text-red-800",
          border: "border-red-300",
        },
        super_admin: {
          bg: "bg-purple-100",
          text: "text-purple-800",
          border: "border-purple-300",
        },
        user: {
          bg: "bg-green-100",
          text: "text-green-800",
          border: "border-green-300",
        },
      };

      const config = roleConfig[role as keyof typeof roleConfig] || {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-300",
      };

      return (
        <Badge
          variant="outline"
          className={`${config.bg} ${config.text} ${config.border} font-medium text-xs px-2 py-1 border-border`}
        >
          {role === "super_admin" ? "Super Admin" : role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "kor_coins",
    header: "KOR Coins",
    cell: ({ row }) => {
      const coins = row.getValue("kor_coins") as number;
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-sm">
            {coins?.toLocaleString() || "0"}
          </span>
          <span className="text-xs text-muted-foreground">coins</span>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at") as string);
      return (
        <span className="text-sm text-muted-foreground">
          {date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      );
    },
  },
];

export function RecentUsersTable() {
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "recent-users"],
    queryFn: async (): Promise<RecentUser[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, email, role, kor_coins, created_at, avatar_url"
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(`Failed to fetch recent users: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const table = useReactTable({
    data: users || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="relative">
        <Card className="py-0 border border-border rounded-none shadow-none">
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>
                Latest user registrations and their activity
              </CardDescription>
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      <Card className="py-0 border border-border rounded-none shadow-none overflow-hidden gap-0 scrollbar-none">
        {/* Corner borders */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Latest user registrations and their activity
            </CardDescription>
          </div>
          <div className="flex">
            <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
              <span className="text-muted-foreground text-xs">Total Users</span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {users?.length || 0}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] overflow-auto scrollbar-none">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-border/50"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-12 px-4 font-medium text-xs uppercase tracking-wider"
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center justify-center gap-2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-muted/50"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {{
                                  asc: <ChevronUp className="h-3 w-3" />,
                                  desc: <ChevronDown className="h-3 w-3" />,
                                }[header.column.getIsSorted() as string] ?? (
                                  <ChevronsUpDown className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3">
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
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-sm">No users found</div>
                        <div className="text-xs">
                          No recent user registrations
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
