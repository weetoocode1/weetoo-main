"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Coins,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { UserData } from "./users";
import { getStatusColor, getRoleLabel } from "./user-helpers";

interface UserTableProps {
  users: UserData[];
  currentPage: number;
  pageSize: number;
  totalUsers: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
}

export function UserTable({
  users,
  currentPage,
  pageSize,
  totalUsers,
  onPageChange,
  onPageSizeChange,
}: UserTableProps) {
  const totalPages = Math.ceil(totalUsers / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b">
            <TableHead className="font-medium py-3">User</TableHead>
            <TableHead className="font-medium">UID</TableHead>
            <TableHead className="font-medium">Status</TableHead>
            <TableHead className="font-medium">Warnings</TableHead>
            <TableHead className="font-medium">Kor Coin</TableHead>
            <TableHead className="font-medium">Registered</TableHead>
            <TableHead className="font-medium">Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="hover:bg-muted/50 transition-colors"
            >
              <TableCell className="py-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar || ""} />
                    <AvatarFallback className="text-sm">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getRoleLabel(user.role)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {user.uid}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`${getStatusColor(user.status)} text-xs border-0`}
                >
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  {user.warnings > 0 && (
                    <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <span
                    className={`text-sm ${
                      user.warnings > 0
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {user.warnings}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <Coins className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium">
                    {user.korCoin.toLocaleString()}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(user.registered).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {user.maskedEmail}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/30 gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={onPageSizeChange}>
            <SelectTrigger className="w-16 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap justify-center sm:justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, totalUsers)} of {totalUsers}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No users found</p>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search terms
          </p>
        </div>
      )}
    </div>
  );
}
