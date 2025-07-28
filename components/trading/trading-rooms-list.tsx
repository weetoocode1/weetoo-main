"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleXIcon,
  Columns3Icon,
  Crown,
  DoorOpenIcon,
  Eye,
  EyeOff,
  FilterIcon,
  GlobeIcon,
  ListFilterIcon,
  LockIcon,
  MessageSquareIcon,
  MicIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CreateRoom } from "./create-room";

interface TradingRoom {
  id: string;
  name: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
  };
  symbol: string;
  category: "regular" | "voice";
  createdAt: string;
  createdAtTimestamp: number;
  isPublic: boolean;
  isHosted: boolean;
  participants: number;
  pnlPercentage: number | null;
}

const multiColumnFilterFn: FilterFn<TradingRoom> = (
  row,
  columnId,
  filterValue
) => {
  const searchableRowContent =
    `${row.original.name} ${row.original.symbol} ${row.original.creator.name}`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

const categoryFilterFn: FilterFn<TradingRoom> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const category = row.getValue(columnId) as string;
  return filterValue.includes(category);
};

const accessFilterFn: FilterFn<TradingRoom> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const isPublic = row.getValue(columnId) as boolean;
  return filterValue.includes(isPublic ? "public" : "private");
};

function CreatedAtCell({ value }: { value: string }) {
  const [relative, setRelative] = useState<string>("");

  useEffect(() => {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      setRelative(formatDistanceToNow(date, { addSuffix: true }));
    } else {
      setRelative("-");
    }
  }, [value]);

  const dateObj = new Date(value);
  const isValidDate = !isNaN(dateObj.getTime());
  // Fixed format: DD-MM-YYYY HH:mm:ss
  const fixedFormat = isValidDate
    ? format(dateObj, "dd-MM-yyyy HH:mm:ss")
    : "-";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{relative}</span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="w-[180px] flex items-center flex-col font-mono"
        >
          <span>{fixedFormat}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TradingRoomsList() {
  const id = useId();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "createdAt",
      desc: true,
    },
  ]);

  const [rooms, setRooms] = useState<TradingRoom[] | null>(null);
  const [, setTotal] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Add a ref to store the Supabase channel for cleanup
  const supabaseChannelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  // Refetch function for rooms
  const fetchRooms = () => {
    setLoading(true);
    const start = performance.now();
    const page = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;
    fetch(`/api/trading-rooms?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((result) => {
        setRooms(result.data);
        setTotal(result.total);
        setLoading(false);
        const end = performance.now();
        console.log(
          "Trading rooms API fetch took",
          (end - start).toFixed(2),
          "ms"
        );
      });
  };

  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    roomId: string | null;
    roomName: string;
    password: string;
    loading: boolean;
  }>({ open: false, roomId: null, roomName: "", password: "", loading: false });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [pagination.pageIndex, pagination.pageSize]);

  // Add Supabase realtime subscription for trading_rooms updates
  useEffect(() => {
    const supabase = createClient();
    // Subscribe to UPDATE events on trading_rooms
    const channel = supabase
      .channel("trading-rooms-list-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_rooms",
        },
        (payload) => {
          // If a room is closed (room_status changed to 'ended'), refetch the list
          if (payload.new?.room_status === "ended") {
            fetchRooms();
          }
        }
      )
      .subscribe();
    supabaseChannelRef.current = channel;
    return () => {
      if (supabaseChannelRef.current) {
        supabase.removeChannel(supabaseChannelRef.current);
      }
    };
  }, [pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id || null);
    });
  }, []);

  // Update isHosted for rooms when currentUserId or rooms change
  useEffect(() => {
    if (!currentUserId || !rooms) return;
    setRooms((prevRooms) =>
      prevRooms
        ? prevRooms.map((room) => ({
            ...room,
            isHosted: room.creator.id === currentUserId,
          }))
        : prevRooms
    );
  }, [currentUserId]);

  const columns = useMemo<ColumnDef<TradingRoom>[]>(
    () => [
      {
        header: "Room",
        accessorKey: "name",
        cell: ({ row }) => {
          const room = row.original;
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{room.name}</span>
                {currentUserId && room.creator.id === currentUserId && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                    <Crown className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {room.symbol}
              </span>
            </div>
          );
        },
        size: 260,
        filterFn: multiColumnFilterFn,
        enableHiding: false,
      },
      {
        header: "Creator",
        accessorKey: "creator",
        cell: ({ row }) => {
          const creator = row.original.creator;
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {creator.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{creator.name}</span>
            </div>
          );
        },
        size: 180,
        headerProps: { className: "text-left" },
        cellProps: { className: "text-left" },
      },
      {
        header: "P&L %",
        accessorKey: "pnlPercentage",
        cell: ({ row }) => {
          const pnl = row.original.pnlPercentage;
          return (
            <span
              className={cn(
                "font-medium",
                pnl == null
                  ? "text-muted-foreground"
                  : pnl > 0
                  ? "text-green-500"
                  : pnl < 0
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              {pnl == null ? "-" : `${pnl > 0 ? "+" : ""}${pnl.toFixed(2)}%`}
            </span>
          );
        },
        size: 90,
      },
      {
        header: "Participants",
        accessorKey: "participants",
        cell: ({ row }) => {
          const room = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{room.participants}</span>
              </div>
            </div>
          );
        },
        size: 120,
      },
      {
        header: "Type",
        accessorKey: "category",
        cell: ({ row }) => {
          const category = row.getValue("category") as string;
          return (
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                category === "voice"
                  ? "border-blue-200 dark:border-blue-800"
                  : "border-emerald-200 dark:border-emerald-800"
              )}
            >
              {category === "voice" ? (
                <MicIcon className="h-3 w-3 mr-1 text-blue-500" />
              ) : (
                <MessageSquareIcon className="h-3 w-3 mr-1 text-emerald-500" />
              )}
              {category === "voice" ? "Voice" : "Chat"}
            </Badge>
          );
        },
        size: 100,
        filterFn: categoryFilterFn,
      },
      {
        header: "Access",
        accessorKey: "isPublic",
        cell: ({ row }) => {
          const isPublic = row.getValue("isPublic") as boolean;
          return (
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                isPublic
                  ? "border-slate-200 dark:border-slate-700"
                  : "border-slate-300 dark:border-slate-600"
              )}
            >
              {isPublic ? (
                <GlobeIcon className="h-3 w-3 mr-1 text-slate-500" />
              ) : (
                <LockIcon className="h-3 w-3 mr-1 text-slate-500" />
              )}
              {isPublic ? "Public" : "Private"}
            </Badge>
          );
        },
        size: 100,
        filterFn: accessFilterFn,
      },
      {
        header: "Created",
        accessorKey: "createdAt",
        cell: ({ row }) => <CreatedAtCell value={row.original.createdAt} />,
        size: 140,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          return (
            rowA.original.createdAtTimestamp - rowB.original.createdAtTimestamp
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end pr-4">
            <Button
              size="sm"
              className="px-4 h-9 font-medium cursor-pointer"
              onClick={() => handleJoinRoom(row.original)}
            >
              <DoorOpenIcon />
              Join Room
            </Button>
          </div>
        ),
        size: 120,
        enableHiding: false,
      },
    ],
    [currentUserId]
  );

  const table = useReactTable({
    data: rooms || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
  });

  const uniqueCategoryValues = useMemo(() => {
    const categoryColumn = table.getColumn("category");
    if (!categoryColumn) return [];
    const values = Array.from(categoryColumn.getFacetedUniqueValues().keys());
    return values.sort();
  }, [table.getColumn("category")?.getFacetedUniqueValues()]);

  const categoryCounts = useMemo(() => {
    const categoryColumn = table.getColumn("category");
    if (!categoryColumn) return new Map();
    return categoryColumn.getFacetedUniqueValues();
  }, [table.getColumn("category")?.getFacetedUniqueValues()]);

  const selectedCategories = useMemo(() => {
    const filterValue = table
      .getColumn("category")
      ?.getFilterValue() as string[];
    return filterValue ?? [];
  }, [table.getColumn("category")?.getFilterValue()]);

  const handleCategoryChange = (checked: boolean, value: string) => {
    const filterValue = table
      .getColumn("category")
      ?.getFilterValue() as string[];
    const newFilterValue = filterValue ? [...filterValue] : [];

    if (checked) {
      newFilterValue.push(value);
    } else {
      const index = newFilterValue.indexOf(value);
      if (index > -1) {
        newFilterValue.splice(index, 1);
      }
    }

    table
      .getColumn("category")
      ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  const accessOptions = [
    { value: "public", label: "Public" },
    { value: "private", label: "Private" },
  ];

  const selectedAccess = useMemo(() => {
    const filterValue = table
      .getColumn("isPublic")
      ?.getFilterValue() as string[];
    return filterValue ?? [];
  }, [table.getColumn("isPublic")?.getFilterValue()]);

  const handleAccessChange = (checked: boolean, value: string) => {
    const filterValue = table
      .getColumn("isPublic")
      ?.getFilterValue() as string[];
    const newFilterValue = filterValue ? [...filterValue] : [];

    if (checked) {
      newFilterValue.push(value);
    } else {
      const index = newFilterValue.indexOf(value);
      if (index > -1) {
        newFilterValue.splice(index, 1);
      }
    }

    table
      .getColumn("isPublic")
      ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  const handleJoinRoom = (room: TradingRoom) => {
    if (!currentUserId) {
      toast.warning("Please log in to join the room.");
      return;
    }
    if (room.isPublic || room.isHosted) {
      window.open(`/room/${room.id}`, "_blank");
    } else {
      setPasswordDialog({
        open: true,
        roomId: room.id,
        roomName: room.name,
        password: "",
        loading: false,
      });
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordDialog.roomId) return;
    setPasswordDialog((d) => ({ ...d, loading: true }));

    // Use API route for password verification
    const response = await fetch("/api/verify-room-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: passwordDialog.roomId,
        password: passwordDialog.password,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error || "Incorrect password. Please try again.");
      setPasswordDialog((d) => ({ ...d, loading: false }));
      return;
    }

    toast.success("Password correct! Joining room...");
    setPasswordDialog({
      open: false,
      roomId: null,
      roomName: "",
      password: "",
      loading: false,
    });
    window.open(`/room/${passwordDialog.roomId}`, "_blank");
  };

  return (
    <>
      {/* Password Dialog */}
      <Dialog
        open={passwordDialog.open}
        onOpenChange={(open) => setPasswordDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-md w-full rounded-2xl shadow-2xl border border-border p-0 overflow-hidden">
          <div className="flex flex-col items-center justify-center px-8 py-8 gap-4">
            <div className="w-full text-center">
              <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">
                Private Room
              </DialogTitle>
              <p className="text-muted-foreground text-sm mb-2">
                Enter the password to join{" "}
                <span className="font-semibold text-primary">
                  {passwordDialog.roomName}
                </span>
              </p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Room password"
                  className="h-10 pr-12 text-base"
                  value={passwordDialog.password}
                  onChange={(e) =>
                    setPasswordDialog((d) => ({
                      ...d,
                      password: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePasswordSubmit();
                  }}
                  disabled={passwordDialog.loading}
                  autoFocus
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={passwordDialog.loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <Button
                onClick={handlePasswordSubmit}
                disabled={passwordDialog.loading || !passwordDialog.password}
                className="w-full h-10 mt-2 text-base font-semibold"
              >
                {passwordDialog.loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  "Join Room"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-4">
        {/* Filters and controls (always visible) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 w-full sm:w-auto">
              <Input
                id={`${id}-input`}
                ref={inputRef}
                className={cn(
                  "peer w-full sm:w-[300px] ps-9",
                  Boolean(table.getColumn("name")?.getFilterValue()) && "pe-9"
                )}
                value={
                  (table.getColumn("name")?.getFilterValue() ?? "") as string
                }
                onChange={(e) =>
                  table.getColumn("name")?.setFilterValue(e.target.value)
                }
                placeholder="Filter by name, symbol, or creator..."
                type="text"
                aria-label="Filter by name, symbol, or creator"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <ListFilterIcon size={16} aria-hidden="true" />
              </div>
              {Boolean(table.getColumn("name")?.getFilterValue()) && (
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Clear filter"
                  onClick={() => {
                    table.getColumn("name")?.setFilterValue("");
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                >
                  <CircleXIcon size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Filter by type */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-36 cursor-pointer"
                >
                  <FilterIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  Type
                  {selectedCategories.length > 0 && (
                    <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                      {selectedCategories.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto min-w-36 p-3" align="start">
                <div className="space-y-3">
                  <div className="text-muted-foreground text-xs font-medium">
                    Filters
                  </div>
                  <div className="space-y-3">
                    {uniqueCategoryValues.map((value, i) => (
                      <div key={value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${id}-category-${i}`}
                          checked={selectedCategories.includes(value)}
                          onCheckedChange={(checked: boolean) =>
                            handleCategoryChange(checked, value)
                          }
                        />
                        <Label
                          htmlFor={`${id}-category-${i}`}
                          className="flex grow justify-between gap-2 font-normal"
                        >
                          {value === "voice" ? "Voice" : "Chat"}{" "}
                          <span className="text-muted-foreground ms-2 text-xs">
                            {categoryCounts.get(value)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter by access */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-36 cursor-pointer"
                >
                  <FilterIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  Access
                  {selectedAccess.length > 0 && (
                    <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                      {selectedAccess.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto min-w-36 p-3" align="start">
                <div className="space-y-3">
                  <div className="text-muted-foreground text-xs font-medium">
                    Filters
                  </div>
                  <div className="space-y-3">
                    {accessOptions.map((option, i) => (
                      <div
                        key={option.value}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`${id}-access-${i}`}
                          checked={selectedAccess.includes(option.value)}
                          onCheckedChange={(checked: boolean) =>
                            handleAccessChange(checked, option.value)
                          }
                        />
                        <Label
                          htmlFor={`${id}-access-${i}`}
                          className="flex grow justify-between gap-2 font-normal"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Toggle columns visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-32 cursor-pointer"
                >
                  <Columns3Icon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            <CreateRoom />
          </div>
        </div>

        {/* Table with always-visible headers, skeleton only for rows */}
        <div className="bg-background overflow-x-auto rounded-md border">
          <Table className="table-fixed min-w-[800px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className="h-11 pl-5"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            header.column.getCanSort() &&
                              "flex h-full cursor-pointer items-center justify-start gap-2 select-none"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (
                              header.column.getCanSort() &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          }}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getIsSorted() === "asc" ? (
                            <ChevronUpIcon
                              className="shrink-0 opacity-80 text-primary"
                              size={16}
                              aria-hidden="true"
                            />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDownIcon
                              className="shrink-0 opacity-80 text-primary"
                              size={16}
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="flex flex-col items-center opacity-40">
                              <ChevronUpIcon size={12} />
                              <ChevronDownIcon
                                size={12}
                                style={{ marginTop: -4 }}
                              />
                            </span>
                          )}
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading || !rooms ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i} className="h-16">
                    {columns.map((col, j) => (
                      <TableCell key={j} className="pl-5 py-5">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="h-16">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="pl-5 py-5">
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
                    No trading rooms found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
            <Label htmlFor={id} className="max-sm:sr-only">
              Rows per page
            </Label>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger id={id} className="w-fit whitespace-nowrap">
                <SelectValue placeholder="Select number of results" />
              </SelectTrigger>
              <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
                {[5, 10, 25, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
            <p
              className="text-muted-foreground text-sm whitespace-nowrap"
              aria-live="polite"
            >
              <span className="text-foreground">
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
                -
                {Math.min(
                  Math.max(
                    table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      table.getState().pagination.pageSize,
                    0
                  ),
                  table.getRowCount()
                )}
              </span>{" "}
              of{" "}
              <span className="text-foreground">
                {table.getRowCount().toString()}
              </span>
            </p>
          </div>

          <div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => table.firstPage()}
                    disabled={!table.getCanPreviousPage()}
                    aria-label="Go to first page"
                  >
                    <ChevronFirstIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    aria-label="Go to previous page"
                  >
                    <ChevronLeftIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    aria-label="Go to next page"
                  >
                    <ChevronRightIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}
                    aria-label="Go to last page"
                  >
                    <ChevronLastIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </>
  );
}
