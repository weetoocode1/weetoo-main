"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
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
import { useAuth } from "@/hooks/use-auth";
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
  isHostStreaming?: boolean; // New field to track if host is streaming
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

// Custom time formatting function with translations
const formatTimeAgo = (
  date: Date,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t("timeAgo.justNow");
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? t("timeAgo.minuteAgo")
      : t("timeAgo.minutesAgo", { count: diffInMinutes });
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1
      ? t("timeAgo.hourAgo")
      : t("timeAgo.hoursAgo", { count: diffInHours });
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1
      ? t("timeAgo.dayAgo")
      : t("timeAgo.daysAgo", { count: diffInDays });
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1
      ? t("timeAgo.weekAgo")
      : t("timeAgo.weeksAgo", { count: diffInWeeks });
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1
      ? t("timeAgo.monthAgo")
      : t("timeAgo.monthsAgo", { count: diffInMonths });
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1
    ? t("timeAgo.yearAgo")
    : t("timeAgo.yearsAgo", { count: diffInYears });
};

function CreatedAtCell({
  value,
  t,
}: {
  value: string;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const [relative, setRelative] = useState<string>("");

  useEffect(() => {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      setRelative(formatTimeAgo(date, t));
    } else {
      setRelative("-");
    }
  }, [value, t]);

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
  const tCreate = useTranslations("createRoom");
  const tCommon = useTranslations("common");
  const { user: authUser } = useAuth();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [streamingRooms, setStreamingRooms] = useState<Set<string>>(new Set());

  // React Query client for cache management
  const queryClient = useQueryClient();

  // ===== Latest reset markers (to zero PNL display when a room has been reset) =====
  const { data: latestResets } = useQuery({
    queryKey: ["trading-rooms", "latest-resets"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("v_room_latest_reset")
        .select("room_id, reset_at")
        .limit(10000);
      if (error) throw error;
      return data as { room_id: string; reset_at: string }[];
    },
    staleTime: 10_000,
  });
  const resetRoomIdSet = useMemo(
    () => new Set((latestResets || []).map((r) => r.room_id)),
    [latestResets]
  );

  // Password verification mutation
  const verifyPasswordMutation = useMutation({
    mutationFn: async ({
      roomId,
      password,
    }: {
      roomId: string;
      password: string;
    }) => {
      const response = await fetch("/api/verify-room-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Incorrect password");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(t("passwordCorrect"));
      setPasswordDialog({
        open: false,
        roomId: null,
        roomName: "",
        password: "",
      });

      // Small delay to show success message before opening room
      setTimeout(() => {
        window.open(`/room/${variables.roomId}`, "_blank");
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred. Please try again.");
      // Error handling is done in the mutation's onError callback
    },
  });

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

  // React Query for infinite rooms with more responsive caching
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
    staleTime: 500, // Data is fresh for 500ms (more responsive)
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes (shorter)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: 10000, // Refetch every 10 seconds as backup
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
      isHostStreaming: streamingRooms.has(room.id),
    }));
  }, [currentUserId, filteredRooms, streamingRooms]);

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
  }>({ open: false, roomId: null, roomName: "", password: "" });
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
          event: "INSERT",
          schema: "public",
          table: "trading_room_participants",
        },
        async (payload) => {
          console.log("Participant joined:", payload);
          await invalidateTradingRoomsCache();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_room_participants",
        },
        async (payload) => {
          console.log("Participant updated:", payload);
          await invalidateTradingRoomsCache();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "trading_room_participants",
        },
        async (payload) => {
          console.log("Participant left:", payload);
          await invalidateTradingRoomsCache();
        }
      )
      .subscribe((status) => {
        console.log("Trading rooms participants subscription status:", status);
      });

    const invalidateTradingRoomsCache = async () => {
      try {
        // Invalidate all trading rooms queries
        await queryClient.invalidateQueries({
          queryKey: ["trading-rooms"],
          refetchType: "all",
        });

        // Force refetch active queries
        await queryClient.refetchQueries({
          queryKey: ["trading-rooms"],
          type: "active",
        });

        console.log(
          "Successfully invalidated and refetched trading rooms cache"
        );
      } catch (error) {
        console.error("Error invalidating trading rooms cache:", error);
      }
    };

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Listen for identity verification completion
  useEffect(() => {
    const handleIdentityVerified = (event: Event) => {
      // Force a re-render to update verification status
      // This will update the authUser.identity_verified status instantly
      // The useAuth hook will have updated the user data, so we just need to trigger a re-render
      setSearchTerm((prev) => prev); // Triggers re-render with updated verification status
    };

    window.addEventListener("identity-verified", handleIdentityVerified);
    return () =>
      window.removeEventListener("identity-verified", handleIdentityVerified);
  }, []);

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

  // Real-time subscription for streaming status updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("room-streaming-status")
      .on(
        "broadcast",
        {
          event: "streaming-status",
        },
        (payload) => {
          const { roomId, isStreaming } = payload.payload;
          console.log("Streaming status update:", { roomId, isStreaming });

          setStreamingRooms((prev) => {
            const newSet = new Set(prev);
            if (isStreaming) {
              newSet.add(roomId);
            } else {
              newSet.delete(roomId);
            }
            return newSet;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
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

  const handleJoinRoom = (room: TradingRoom) => {
    if (!authUser) {
      toast.warning(t("pleaseLoginToJoin"));
      return;
    }

    // Check identity verification
    if (!authUser.identity_verified) {
      toast.error(
        `${tCommon("identityVerificationRequired")} to join trading rooms.`
      );
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
      });
    }
  };

  const handlePasswordSubmit = () => {
    if (!passwordDialog.roomId || !passwordDialog.password) return;

    // Loading state is handled by React Query mutation

    verifyPasswordMutation.mutate({
      roomId: passwordDialog.roomId,
      password: passwordDialog.password,
    });
  };

  return (
    <>
      {/* Password Dialog */}
      <Dialog
        open={passwordDialog.open}
        onOpenChange={(open) => setPasswordDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-lg w-full rounded-3xl shadow-2xl border-0 p-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
          {/* Animated background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-purple-500/10 animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,165,0,0.1),transparent_50%)] animate-pulse" />

          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-1/4 left-1/4 w-2 h-2 bg-orange-400/30 rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            />
            <div
              className="absolute top-1/3 right-1/3 w-1 h-1 bg-red-400/40 rounded-full animate-bounce"
              style={{ animationDelay: "0.5s" }}
            />
            <div
              className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-bounce"
              style={{ animationDelay: "1s" }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center px-10 py-12 gap-8">
            {/* Animated lock icon with glow effects */}
            <div className="relative">
              {/* Outer glow rings */}
              <div className="absolute inset-0 w-24 h-24 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-xl animate-pulse" />
              <div
                className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-orange-400/30 to-red-400/30 rounded-full blur-lg animate-pulse"
                style={{ animationDelay: "0.5s" }}
              />

              {/* Main lock container */}
              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
                <LockIcon className="h-8 w-8 text-white drop-shadow-lg relative z-10" />

                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-2xl animate-pulse" />
              </div>
            </div>

            {/* Title with animated gradient */}
            <div className="text-center space-y-3">
              <DialogTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-red-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                {t("privateRoomAccess")}
              </DialogTitle>
              <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
                {t("enterPasswordPlaceholder")}{" "}
                <span className="font-semibold text-orange-300 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text bg-transparent">
                  {passwordDialog.roomName}
                </span>
              </p>
            </div>

            {/* Enhanced password input */}
            <div className="w-full space-y-6">
              <div className="relative group">
                {/* Input background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("enterPasswordPlaceholder")}
                    className="h-14 pr-14 text-base bg-slate-800/50 border-2 border-slate-700/50 focus:border-orange-500/70 focus:bg-slate-800/70 rounded-xl transition-all duration-300 text-white placeholder:text-slate-400 backdrop-blur-sm"
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
                    disabled={verifyPasswordMutation.isPending}
                    autoFocus
                  />

                  {/* Password toggle button */}
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-300 focus:outline-none cursor-pointer transition-all duration-200 hover:scale-110"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    disabled={verifyPasswordMutation.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action buttons with enhanced styling */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setPasswordDialog((d) => ({ ...d, open: false }))
                  }
                  className="flex-1 h-14 text-base font-medium bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-white rounded-xl transition-all duration-300 backdrop-blur-sm"
                  disabled={verifyPasswordMutation.isPending}
                >
                  {tCreate("cancel")}
                </Button>

                <Button
                  onClick={handlePasswordSubmit}
                  disabled={
                    verifyPasswordMutation.isPending || !passwordDialog.password
                  }
                  className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 hover:from-orange-600 hover:via-red-600 hover:to-purple-600 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50 backdrop-blur-sm relative overflow-hidden group"
                >
                  {/* Button background animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-red-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {verifyPasswordMutation.isPending ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
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
                        <span>{t("joining")}</span>
                      </>
                    ) : (
                      <>
                        <LockIcon className="h-4 w-4" />
                        <span>{t("joinRoom")}</span>
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </div>

            {/* Security notice */}
            <div className="text-center">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                <LockIcon className="h-3 w-3" />
                {t("passwordSecurityNote")}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile/Tablet header (two rows) */}
      <div className="mb-4 lg:hidden">
        {/* Search row */}
        <div className="px-3 sm:px-0 mb-2 sm:mb-3">
          <div className="relative w-full sm:w-[420px]">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              className="pl-10 pr-10 h-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("filterPlaceholder")}
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
        </div>

        {/* Filters + Create row */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-0">
          {/* Scrollable filters group on mobile */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
              {/* Type Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 flex-shrink-0"
                  >
                    <FilterIcon className="h-4 w-4 mr-2" />
                    {t("typeFilter")}
                    {selectedCategories.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedCategories.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="start">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">{t("roomType")}</h4>
                    {/* Hiding 'voice' option from the type filter. Original dynamic mapping kept for reference:
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
                          {value === "voice" ? t("voice") : t("chat")}
                        </Label>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {categoryCounts.get(value)}
                        </span>
                      </div>
                    ))}
                    */}
                    {uniqueCategoryValues
                      .filter((value) => value !== "voice")
                      .map((value, i) => (
                        <div
                          key={value}
                          className="flex items-center space-x-2"
                        >
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
                            {t("chat")}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 flex-shrink-0"
                  >
                    <FilterIcon className="h-4 w-4 mr-2" />
                    {t("accessFilter")}
                    {selectedAccess.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedAccess.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="start">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">{t("roomAccess")}</h4>
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
            </div>
          </div>

          {/* Create Room Button */}
          <div className="flex-shrink-0 ml-2">
            <CreateRoom />
          </div>
        </div>
      </div>

      {/* Desktop header (single row, unchanged layout) */}
      <div className="hidden lg:flex items-center justify-between gap-4 mb-4">
        {/* Search */}
        <div className="relative w-[420px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            className="pl-10 pr-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("filterPlaceholder")}
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm("")}
            >
              <CircleXIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10">
                <FilterIcon className="h-4 w-4 mr-2" />
                {t("typeFilter")}
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">{t("roomType")}</h4>
                {/* Hiding 'voice' option from the type filter (desktop). Keeping original for reference:
                {uniqueCategoryValues.map((value, i) => (
                  <div key={value} className=\"flex items-center space-x-2\">
                    <Checkbox
                      id={`${id}-category-lg-${i}`}
                      checked={selectedCategories.includes(value)}
                      onCheckedChange={(checked: boolean) =>
                        handleCategoryChange(checked, value)
                      }
                    />
                    <Label
                      htmlFor={`${id}-category-lg-${i}`}
                      className=\"flex-1 text-sm cursor-pointer\"
                    >
                      {value === \"voice\" ? t(\"voice\") : t(\"chat\")}
                    </Label>
                    <span className=\"text-xs text-muted-foreground bg-muted px-2 py-1 rounded\">
                      {categoryCounts.get(value)}
                    </span>
                  </div>
                ))}
                */}
                {uniqueCategoryValues
                  .filter((value) => value !== "voice")
                  .map((value, i) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${id}-category-lg-${i}`}
                        checked={selectedCategories.includes(value)}
                        onCheckedChange={(checked: boolean) =>
                          handleCategoryChange(checked, value)
                        }
                      />
                      <Label
                        htmlFor={`${id}-category-lg-${i}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        {t("chat")}
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
                {t("accessFilter")}
                {selectedAccess.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedAccess.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">{t("roomAccess")}</h4>
                {accessOptions.map((option, i) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`${id}-access-lg-${i}`}
                      checked={selectedAccess.includes(option.value)}
                      onCheckedChange={(checked: boolean) =>
                        handleAccessChange(checked, option.value)
                      }
                    />
                    <Label
                      htmlFor={`${id}-access-lg-${i}`}
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

          {/* Create Room */}
          <CreateRoom />
        </div>
      </div>

      {/* Grid of room cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 sm:px-0">
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
                onClick={() => handleJoinRoom(room)}
              >
                {/* Room card content */}
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

                  {/* Live indicator - only show when host is actively streaming */}
                  {room.isHostStreaming && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                      {t("live")}
                    </div>
                  )}

                  {/* Private room indicator */}
                  {!room.isPublic && (
                    <div className="absolute top-2 right-2 bg-orange-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <LockIcon className="h-3 w-3" />
                      {t("private")}
                    </div>
                  )}

                  {/* Participants count */}
                  {room.participants > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {room.participants}{" "}
                      {room.participants === 1
                        ? t("participant")
                        : t("participants")}
                    </div>
                  )}

                  {/* Verification required overlay for unverified users */}
                  {!authUser?.identity_verified && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center text-white p-4">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                        <p className="text-sm font-medium">
                          {tCommon("identityVerificationRequired")}
                        </p>
                        <p className="text-xs text-gray-300 mt-1">
                          {t("identityVerificationToJoin")}
                        </p>
                      </div>
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
                              : "bg-gradient-to-br from-emerald-500 to-emerald-600"
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
                            <CreatedAtCell value={room.createdAt} t={t} />
                          </span>
                        </div>

                        {/* PNL with trending icon - moved to right */}
                        {room.pnlPercentage !== null && (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const effectivePnl = resetRoomIdSet.has(room.id)
                                ? 0
                                : (room.pnlPercentage as number);
                              if (effectivePnl > 0) {
                                return (
                                  <TrendingUp className="h-3 w-3 text-green-400" />
                                );
                              }
                              if (effectivePnl < 0) {
                                return (
                                  <TrendingDown className="h-3 w-3 text-red-400" />
                                );
                              }
                              return (
                                <TrendingUp className="h-3 w-3 text-slate-400" />
                              );
                            })()}
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                (resetRoomIdSet.has(room.id)
                                  ? 0
                                  : (room.pnlPercentage as number)) > 0
                                  ? "text-green-400"
                                  : (resetRoomIdSet.has(room.id)
                                      ? 0
                                      : (room.pnlPercentage as number)) < 0
                                  ? "text-red-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {(() => {
                                const effectivePnl = resetRoomIdSet.has(room.id)
                                  ? 0
                                  : (room.pnlPercentage as number);
                                return `${
                                  effectivePnl > 0 ? "+" : ""
                                }${effectivePnl.toFixed(2)}% PNL`;
                              })()}
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
                          <div
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md border",
                              room.isPublic
                                ? "bg-slate-800/50 border-slate-700/50"
                                : "bg-orange-900/30 border-orange-700/50"
                            )}
                          >
                            {room.isPublic ? (
                              <GlobeIcon className="h-3 w-3 text-slate-300" />
                            ) : (
                              <LockIcon className="h-3 w-3 text-orange-400" />
                            )}
                            <span
                              className={cn(
                                "text-xs font-medium",
                                room.isPublic
                                  ? "text-slate-300"
                                  : "text-orange-200"
                              )}
                            >
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
                    {t("loadingMoreRooms")}
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
                  {t("loadMoreRooms")}
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
                : t("noRoomsAvailable")}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
