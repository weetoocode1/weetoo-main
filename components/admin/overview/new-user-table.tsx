"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserRegistration = {
  id: string;
  name: string;
  avatar?: string;
  uid: string;
  registered: string;
  status: "verified" | "pending" | "rejected";
};

// Sample user registration data
const registrationData: UserRegistration[] = [
  {
    id: "1",
    name: "Park Ji-won",
    avatar: "",
    uid: "UID-24060501",
    registered: "2024-06-30T08:45:00",
    status: "verified",
  },
  {
    id: "2",
    name: "Kim Tae-hyung",
    avatar: "",
    uid: "UID-24060502",
    registered: "2024-06-29T15:30:00",
    status: "pending",
  },
  {
    id: "3",
    name: "Lee Min-ho",
    avatar: "",
    uid: "UID-24060503",
    registered: "2024-06-29T12:15:00",
    status: "verified",
  },
  {
    id: "4",
    name: "Choi Soo-young",
    avatar: "",
    uid: "UID-24060504",
    registered: "2024-06-28T09:20:00",
    status: "rejected",
  },
  {
    id: "5",
    name: "Jung Ho-yeon",
    avatar: "",
    uid: "UID-24060505",
    registered: "2024-06-27T14:10:00",
    status: "verified",
  },
];

export function NewUserTable() {
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

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  const columns: ColumnDef<UserRegistration>[] = [
    {
      header: "User",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatar} alt={row.getValue("name")} />
            <AvatarFallback>{getInitials(row.getValue("name"))}</AvatarFallback>
          </Avatar>
          <div className="font-medium">{row.getValue("name")}</div>
        </div>
      ),
      size: 200,
    },
    {
      header: "UID",
      accessorKey: "uid",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("uid")}</div>
      ),
      size: 150,
    },
    {
      header: "Registered",
      accessorKey: "registered",
      cell: ({ row }) => {
        return <div>{formatDate(row.getValue("registered"))}</div>;
      },
      size: 150,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <>
            {status === "verified" && (
              <Badge
                variant="outline"
                className="flex w-24 items-center justify-center gap-1 bg-green-50 text-green-700 dark:bg-green-900/20"
              >
                <CheckCircleIcon className="h-3 w-3" />
                Verified
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
            {status === "rejected" && (
              <Badge
                variant="outline"
                className="flex w-24 items-center justify-center gap-1 bg-red-50 text-red-700 dark:bg-red-900/20"
              >
                <XCircleIcon className="h-3 w-3" />
                Rejected
              </Badge>
            )}
          </>
        );
      },
      size: 120,
    },
  ];

  const table = useReactTable({
    data: registrationData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="shadow-none w-full">
      <CardHeader>
        <CardTitle>New User Registration</CardTitle>
        <CardDescription>
          Recently registered users and UID information
        </CardDescription>
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
