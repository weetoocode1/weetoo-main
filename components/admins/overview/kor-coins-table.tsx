"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Transaction = {
  id: string;
  type: "deposit" | "withdrawal";
  user: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  time: string;
};

// Sample transaction data - already sorted by most recent first
const transactionData: Transaction[] = [
  {
    id: "1",
    type: "deposit",
    user: "Kim Min-ji",
    amount: 250000,
    status: "completed",
    time: "2024-06-30T09:15:00",
  },
  {
    id: "2",
    type: "withdrawal",
    user: "Park Ji-sung",
    amount: 180000,
    status: "completed",
    time: "2024-06-29T14:22:00",
  },
  {
    id: "3",
    type: "deposit",
    user: "Lee Soo-jin",
    amount: 500000,
    status: "completed",
    time: "2024-06-29T11:05:00",
  },
  {
    id: "4",
    type: "withdrawal",
    user: "Choi Woo-shik",
    amount: 320000,
    status: "pending",
    time: "2024-06-28T16:48:00",
  },
  {
    id: "5",
    type: "deposit",
    user: "Kang Hye-jung",
    amount: 150000,
    status: "failed",
    time: "2024-06-28T10:30:00",
  },
];

export function KorCoinsTable() {
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      header: "Type",
      accessorKey: "type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.getValue("type") === "deposit" ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20">
              <ArrowDownIcon className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20">
              <ArrowUpIcon className="h-4 w-4" />
            </div>
          )}
          <span className="capitalize">{row.getValue("type")}</span>
        </div>
      ),
      size: 120,
    },
    {
      header: "User",
      accessorKey: "user",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("user")}</div>
      ),
      size: 150,
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("amount"));
        const formatted = new Intl.NumberFormat("ko-KR").format(amount);
        return <div>{formatted} KOR</div>;
      },
      size: 120,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <>
            {status === "completed" && (
              <Badge
                variant="outline"
                className="flex w-24 items-center justify-center gap-1 bg-green-50 text-green-700 dark:bg-green-900/20"
              >
                <CheckCircleIcon className="h-3 w-3" />
                Completed
              </Badge>
            )}
            {status === "pending" && (
              <Badge
                variant="outline"
                className="flex w-24 items-center justify-center gap-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20"
              >
                <ClockIcon className="h-3 w-3" />
                Pending
              </Badge>
            )}
            {status === "failed" && (
              <Badge
                variant="outline"
                className="flex w-24 items-center justify-center gap-1 bg-red-50 text-red-700 dark:bg-red-900/20"
              >
                <XCircleIcon className="h-3 w-3" />
                Failed
              </Badge>
            )}
          </>
        );
      },
      size: 120,
    },
    {
      header: "Time",
      accessorKey: "time",
      cell: ({ row }) => {
        return <div>{formatDate(row.getValue("time"))}</div>;
      },
      size: 120,
    },
  ];

  const table = useReactTable({
    data: transactionData.slice(0, 5), // Only show the first 5 transactions
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Removed sorting functionality
  });

  return (
    <Card className="shadow-none w-full">
      <CardHeader>
        <CardTitle>Recent KOR_Coin Transactions</CardTitle>
        <CardDescription>Last 5 deposits and withdrawals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-background overflow-hidden rounded-md border">
          <Table className="table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className="h-11"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
