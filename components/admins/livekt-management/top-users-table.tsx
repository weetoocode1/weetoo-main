import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { formatCurrency } from "./currency";
import type { User } from "@/types";

interface TopUsersTableProps {
  users: User[];
  isKRW: boolean;
}

export function TopUsersTable({ users, isKRW }: TopUsersTableProps) {
  return (
    <Card className="border border-border gap-0">
      <CardHeader className="border-b border-border">
        <CardTitle className="font-medium">Top Users by Usage</CardTitle>
        <CardDescription>Users with the highest LiveKit usage</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="h-14">
            <TableRow className="border-border hover:bg-transparent py-5">
              <TableHead className="bg-background font-semibold">
                User
              </TableHead>
              <TableHead className="bg-background font-semibold text-right">
                Broadcasting
              </TableHead>
              <TableHead className="bg-background font-semibold text-right">
                Listening
              </TableHead>
              <TableHead className="bg-background font-semibold text-right">
                Cost
              </TableHead>
              <TableHead className="bg-background font-semibold">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow
                key={user.user || `user-${index}`}
                className="border-border hover:bg-muted/50 h-16"
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.avatar}
                    </div>
                    <span className="truncate max-w-[180px]">{user.user}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {user.broadcasting.toLocaleString()} min
                </TableCell>
                <TableCell className="text-right font-mono">
                  {user.listening.toLocaleString()} min
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(user.cost, isKRW)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
