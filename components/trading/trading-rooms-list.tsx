"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  CircleXIcon,
  Clock,
  Crown,
  Eye,
  EyeOff,
  FilterIcon,
  GlobeIcon,
  ImageIcon,
  LockIcon,
  SearchIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Image from "next/image";
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
  thumbnail_url: string | null;
}

const multiColumnFilterFn = (room: TradingRoom, searchTerm: string) => {
  const searchableContent =
    `${room.name} ${room.symbol} ${room.creator.name}`.toLowerCase();
  return searchableContent.includes(searchTerm.toLowerCase());
};

const categoryFilterFn = (room: TradingRoom, selectedCategories: string[]) => {
  if (!selectedCategories?.length) return true;
  return selectedCategories.includes(room.category);
};

const accessFilterFn = (room: TradingRoom, selectedAccess: string[]) => {
  if (!selectedAccess?.length) return true;
  return selectedAccess.includes(room.isPublic ? "public" : "private");
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground">{relative}</span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="w-[180px] flex items-center flex-col font-mono"
        >
          <span>{format(new Date(value), "dd-MM-yyyy HH:mm:ss")}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TradingRoomsList() {
  const t = useTranslations("tradingRooms");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // React Query client for cache management
  const queryClient = useQueryClient();

  // Optimized React Query fetcher
  const fetchTradingRooms = async ({ pageParam = 1 }) => {
    const response = await fetch(
      `/api/trading-rooms?page=${pageParam}&pageSize=20`,
      {
        headers: {
          "Cache-Control": "max-age=10",
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch trading rooms");
    }
    return response.json();
  };

  // React Query for infinite rooms with aggressive caching
  const {
    data: roomsData,
    // error,
    isLoading,
    // isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    // refetch,
  } = useInfiniteQuery({
    queryKey: ["trading-rooms", searchTerm, selectedCategories, selectedAccess],
    queryFn: fetchTradingRooms,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const hasMore = lastPage.data.length === 20;
      return hasMore ? allPages.length + 1 : undefined;
    },
    staleTime: 1000, // Data is fresh for 1 second
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Flatten all pages into a single array of rooms
  const rooms = useMemo(() => {
    if (!roomsData?.pages) return [];
    return roomsData.pages.flatMap((page) => page.data);
  }, [roomsData?.pages]);

  // const totalCount = roomsData?.pages?.[0]?.total || 0;

  // Optimized filtered rooms calculation
  const filteredRooms = useMemo(() => {
    if (!rooms) return [];

    let filtered = rooms;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((room: TradingRoom) =>
        multiColumnFilterFn(room, searchTerm)
      );
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((room: TradingRoom) =>
        categoryFilterFn(room, selectedCategories)
      );
    }

    // Apply access filter
    if (selectedAccess.length > 0) {
      filtered = filtered.filter((room: TradingRoom) =>
        accessFilterFn(room, selectedAccess)
      );
    }

    return filtered;
  }, [rooms, searchTerm, selectedCategories, selectedAccess]);

  // Update isHosted for rooms when currentUserId or rooms change
  const roomsWithHostStatus = useMemo(() => {
    if (!currentUserId || !filteredRooms) return filteredRooms;
    return filteredRooms.map((room: TradingRoom) => ({
      ...room,
      isHosted: room.creator.id === currentUserId,
    }));
  }, [currentUserId, filteredRooms]);

  // Debug logging to track state changes
  useEffect(() => {
    console.log("Rooms state changed:", {
      roomsCount: rooms.length,
      filteredCount: filteredRooms?.length || 0,
      roomsWithHostCount: roomsWithHostStatus?.length || 0,
      isLoading,
      hasNextPage,
    });
  }, [rooms, filteredRooms, roomsWithHostStatus, isLoading, hasNextPage]);

  // React Query handles infinite loading automatically
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Add a ref to store the Supabase channel for cleanup
  const supabaseChannelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    roomId: string | null;
    roomName: string;
    password: string;
    loading: boolean;
  }>({ open: false, roomId: null, roomName: "", password: "", loading: false });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Initial fetch is handled by SWR
  }, []);

  // Real-time subscription for trading room participants - More responsive
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("trading-rooms-participants")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_participants",
        },
        async (payload) => {
          console.log("Participant change detected:", payload);

          // Invalidate and refetch React Query cache
          await queryClient.invalidateQueries({
            queryKey: ["trading-rooms"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Real-time subscription for trading rooms - More responsive
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("trading-rooms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_rooms",
        },
        async (payload) => {
          console.log("Room change detected:", payload);

          // Invalidate and refetch React Query cache
          await queryClient.invalidateQueries({
            queryKey: ["trading-rooms"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Remove virtual scrolling setup that's causing the bug
  // const parentRef = useRef<HTMLDivElement>(null);
  // const rowVirtualizer = useVirtualizer({
  //   count: Math.ceil((roomsWithHostStatus?.length || 0) / 4), // 4 columns per row
  //   getScrollElement: () => parentRef.current,
  //   estimateSize: () => 280, // Estimated height of each row
  //   overscan: 5, // Number of items to render outside the viewport
  // });

  // Intersection observer for infinite scrolling
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (
          target.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          roomsWithHostStatus &&
          roomsWithHostStatus.length > 0
        ) {
          console.log("Intersection observer triggered load more");
          loadMore();
        }
      },
      {
        rootMargin: "200px", // Increased from 100px to 200px to be less aggressive
        threshold: 0.1, // Only trigger when 10% visible
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore, roomsWithHostStatus]);

  // Filter rooms based on search and filters
  useEffect(() => {
    // This effect is now redundant as filteredRooms is derived from SWR
  }, [filteredRooms, searchTerm, selectedCategories, selectedAccess]);

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
            queryClient.invalidateQueries({
              queryKey: ["trading-rooms"],
            });
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
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id || null);
    });
  }, []);

  // Update isHosted for rooms when currentUserId or rooms change
  useEffect(() => {
    // This effect is now redundant as roomsWithHostStatus is derived from SWR
  }, [currentUserId, filteredRooms]);

  const uniqueCategoryValues = useMemo(() => {
    if (!filteredRooms) return [];
    const categories = [...new Set(filteredRooms.map((room) => room.category))];
    return categories.sort();
  }, [filteredRooms]);

  const categoryCounts = useMemo(() => {
    if (!filteredRooms) return new Map();
    const counts = new Map<string, number>();
    filteredRooms.forEach((room) => {
      counts.set(room.category, (counts.get(room.category) || 0) + 1);
    });
    return counts;
  }, [filteredRooms]);

  const handleCategoryChange = (checked: boolean, value: string) => {
    const newSelectedCategories = checked
      ? [...selectedCategories, value]
      : selectedCategories.filter((cat) => cat !== value);
    setSelectedCategories(newSelectedCategories);
  };

  const accessOptions = [
    { value: "public", label: t("public") },
    { value: "private", label: t("private") },
  ];

  const handleAccessChange = (checked: boolean, value: string) => {
    const newSelectedAccess = checked
      ? [...selectedAccess, value]
      : selectedAccess.filter((access) => access !== value);
    setSelectedAccess(newSelectedAccess);
  };

  // const handleJoinRoom = (room: TradingRoom) => {
  //   if (!currentUserId) {
  //     toast.warning(t("pleaseLoginToJoin"));
  //     return;
  //   }
  //   if (room.isPublic || room.isHosted) {
  //     window.open(`/room/${room.id}`, "_blank");
  //   } else {
  //     setPasswordDialog({
  //       open: true,
  //       roomId: room.id,
  //       roomName: room.name,
  //       password: "",
  //       loading: false,
  //     });
  //   }
  // };

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
      toast.error(result.error || t("incorrectPassword"));
      setPasswordDialog((d) => ({ ...d, loading: false }));
      return;
    }

    toast.success(t("passwordCorrect"));
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
                {t("privateRoom")}
              </DialogTitle>
              <p className="text-muted-foreground text-sm mb-2">
                {t("enterPasswordToJoin")}{" "}
                <span className="font-semibold text-primary">
                  {passwordDialog.roomName}
                </span>
              </p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("roomPassword")}
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
                  aria-label={
                    showPassword ? t("hidePassword") : t("showPassword")
                  }
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
                    {t("joining")}
                  </span>
                ) : (
                  t("joinRoom")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header with search and filters */}
      <div className="flex items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-[400px]">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            className="pl-10 pr-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rooms, symbols, or creators..."
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm("")}
            >
              <CircleXIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-3">
          {/* Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10">
                <FilterIcon className="h-4 w-4 mr-2" />
                Type
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Room Type</h4>
                {uniqueCategoryValues.map((value, i) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${id}-category-${i}`}
                      checked={selectedCategories.includes(value)}
                      onCheckedChange={(checked: boolean) =>
                        handleCategoryChange(checked, value)
                      }
                    />
                    <Label
                      htmlFor={`${id}-category-${i}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {value === "voice" ? "Voice" : "Chat"}
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {categoryCounts.get(value)}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Access Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10">
                <FilterIcon className="h-4 w-4 mr-2" />
                Access
                {selectedAccess.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedAccess.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Room Access</h4>
                {accessOptions.map((option, i) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
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
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    {option.value === "public" ? (
                      <GlobeIcon className="h-3 w-3 text-blue-500" />
                    ) : (
                      <LockIcon className="h-3 w-3 text-orange-500" />
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {(selectedCategories.length > 0 ||
            selectedAccess.length > 0 ||
            searchTerm) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategories([]);
                setSelectedAccess([]);
              }}
              className="h-10 px-4 text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}

          {/* Create Room Button */}
          <CreateRoom />
        </div>
      </div>

      {/* Grid of room cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          // Loading skeletons that match the card design
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="group relative bg-background rounded-lg overflow-hidden border border-border"
            >
              {/* Thumbnail Container Skeleton */}
              <div className="relative aspect-video rounded-t-lg overflow-hidden bg-muted">
                <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse" />
              </div>

              {/* Content Area Skeleton */}
              <div className="relative p-4 border border-border border-t-0 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm rounded-b-lg overflow-hidden">
                {/* Top section with avatar and title */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar skeleton */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-muted/30 to-muted/10 rounded-full blur-sm" />
                      <Skeleton className="h-10 w-10 rounded-full relative z-10" />
                    </div>

                    <div className="min-w-0">
                      {/* Title skeleton */}
                      <Skeleton className="h-5 w-32 mb-2" />
                      {/* Host name skeleton */}
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>

                  {/* Status badge skeleton */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-muted/20 to-muted/10 rounded-full blur-sm" />
                    <Skeleton className="h-6 w-16 rounded-full relative z-10" />
                  </div>
                </div>

                {/* Bottom section with stats and indicators */}
                <div className="space-y-3">
                  {/* Time and PNL skeleton */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>

                  {/* Access and Host badges skeleton */}
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-16 rounded-md" />
                    <Skeleton className="h-6 w-12 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : roomsWithHostStatus && roomsWithHostStatus.length > 0 ? (
          <>
            {roomsWithHostStatus.map((room: TradingRoom) => (
              <div
                key={room.id}
                className="group relative bg-background rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10"
                onClick={() => window.open(`/room/${room.id}`, "_blank")}
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video rounded-t-lg overflow-hidden bg-muted group-hover:bg-muted/80 transition-colors duration-300">
                  {room.thumbnail_url && !imageErrors.has(room.id) ? (
                    <Image
                      src={room.thumbnail_url}
                      alt={room.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={() =>
                        setImageErrors((prev) => new Set(prev).add(room.id))
                      }
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Live indicator */}
                  {room.participants > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      LIVE
                    </div>
                  )}

                  {/* Participants count */}
                  {room.participants > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {room.participants}{" "}
                      {room.participants === 1 ? "participant" : "participants"}
                    </div>
                  )}

                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>

                {/* Video Info */}
                <div className="relative p-4 border border-border border-t-0 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm rounded-b-lg overflow-hidden group">
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-xl" />

                  {/* Main content */}
                  <div className="relative z-10">
                    {/* Top section with avatar and title */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Glowing avatar */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full blur-sm group-hover:blur-md transition-all duration-300" />
                          <Avatar className="h-10 w-10 flex-shrink-0 relative z-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                            <AvatarImage
                              src={room.creator.avatar}
                              alt={room.creator.name}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary-foreground text-sm font-bold">
                              {room.creator.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-base leading-tight line-clamp-1 group-hover:text-primary transition-all duration-300 group-hover:scale-105 transform">
                            {room.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 font-medium">
                            {room.creator.name}
                          </p>
                        </div>
                      </div>

                      {/* Floating status badge */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-full blur-sm group-hover:blur-md transition-all duration-300" />
                        <div
                          className={cn(
                            "relative z-10 px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-sm border border-white/20",
                            room.category === "voice"
                              ? "bg-gradient-to-r from-blue-500 to-blue-600"
                              : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                          )}
                        >
                          {room.category === "voice" ? t("voice") : t("chat")}
                        </div>
                      </div>
                    </div>

                    {/* Bottom section with stats and indicators */}
                    <div className="space-y-3">
                      {/* Time and PNL - Clean horizontal layout */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Time with clock icon */}
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span className="text-xs text-muted-foreground">
                            <CreatedAtCell value={room.createdAt} />
                          </span>
                        </div>

                        {/* PNL with trending icon - moved to right */}
                        {room.pnlPercentage !== null && (
                          <div className="flex items-center gap-2">
                            {room.pnlPercentage > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-400" />
                            ) : room.pnlPercentage < 0 ? (
                              <TrendingDown className="h-3 w-3 text-red-400" />
                            ) : (
                              <TrendingUp className="h-3 w-3 text-slate-400" />
                            )}
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                room.pnlPercentage > 0
                                  ? "text-green-400"
                                  : room.pnlPercentage < 0
                                  ? "text-red-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {room.pnlPercentage > 0 ? "+" : ""}
                              {room.pnlPercentage.toFixed(2)}% PNL
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Access and Host - Clean badges */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          {/* Symbol badge */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/50">
                            <span className="text-xs text-slate-300 font-medium">
                              {room.symbol}
                            </span>
                          </div>

                          {/* Access indicator */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/50">
                            {room.isPublic ? (
                              <GlobeIcon className="h-3 w-3 text-slate-300" />
                            ) : (
                              <LockIcon className="h-3 w-3 text-orange-400" />
                            )}
                            <span className="text-xs text-slate-300 font-medium">
                              {room.isPublic ? t("public") : t("private")}
                            </span>
                          </div>
                        </div>

                        {/* Host indicator */}
                        {currentUserId && room.creator.id === currentUserId && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-900/30 border border-amber-700/50">
                            <Crown className="h-3 w-3 text-amber-300" />
                            <span className="text-xs text-amber-200 font-semibold">
                              {t("host")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more indicator */}
            {isFetchingNextPage && (
              <div className="col-span-full flex justify-center py-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">
                    Loading more rooms...
                  </span>
                </div>
              </div>
            )}

            {/* Load more trigger */}
            {hasNextPage && !isFetchingNextPage && (
              <div
                ref={loadMoreRef}
                className="col-span-full flex justify-center py-4"
              >
                <Button
                  variant="outline"
                  onClick={loadMore}
                  className="text-sm"
                >
                  Load More Rooms
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">
              {searchTerm ||
              selectedCategories.length > 0 ||
              selectedAccess.length > 0
                ? t("noTradingRoomsFound")
                : "No trading rooms available"}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
