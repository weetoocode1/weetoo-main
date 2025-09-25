"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

// Donation will be lazy loaded
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChartStreaming } from "@/hooks/use-chart-streaming";
import { useLivektHostAudio } from "@/hooks/use-livekt-host-audio";
import { usePositions } from "@/hooks/use-positions";
import { useLatestRoomReset } from "@/hooks/use-room-reset";
import { cn } from "@/lib/utils";
import {
  GlobeIcon,
  ImageIcon,
  LockIcon,
  LogOutIcon,
  MicIcon,
  MicOffIcon,
  PencilIcon,
  RefreshCwIcon,
  Video,
  VideoOff,
  Volume2Icon,
  XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Separator } from "../ui/separator";

// Lazy load EditRoomForm since it's only used when editing
const EditRoomForm = dynamic(
  () => import("./edit-room").then((mod) => ({ default: mod.EditRoomForm })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
);

// Lazy load Donation component
const Donation = dynamic(
  () =>
    import("@/components/room/donation").then((mod) => ({
      default: mod.Donation,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
    ),
  }
);

// Type definition for trading position
interface TradingPosition {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  pnl?: number;
  initial_margin?: number;
  stop_loss?: number;
  take_profit?: number;
  opened_at?: string;
  closed_at?: string;
  room_id: string;
  user_id: string;
}

// Component to calculate unrealized PNL with symbol-specific prices
function UnrealizedPnlCalculator({
  openPositions,
  currentPrice,
}: {
  openPositions: TradingPosition[];
  currentPrice?: number;
}) {
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);

  useEffect(() => {
    const calculatePnl = async () => {
      let total = 0;

      for (const pos of openPositions) {
        const entry = Number(pos.entry_price);
        const qty = Number(pos.quantity);
        const side = (pos.side ?? "").toLowerCase();

        if (isNaN(entry) || isNaN(qty) || !side) continue;

        let currentPriceToUse = currentPrice;

        // Only fetch price if not provided and we have a symbol
        if (!currentPriceToUse && pos.symbol) {
          try {
            const response = await fetch(
              `https://api.binance.us/api/v3/ticker/24hr?symbol=${pos.symbol}`
            );
            if (response.ok) {
              const data = await response.json();
              currentPriceToUse = parseFloat(data.lastPrice);
            }
          } catch (error) {
            console.error(`Failed to fetch price for ${pos.symbol}:`, error);
            continue; // Skip this position if we can't get the price
          }
        }

        if (!currentPriceToUse) continue;

        if (side === "long") {
          total += (currentPriceToUse - entry) * qty;
        } else if (side === "short") {
          total += (entry - currentPriceToUse) * qty;
        }
      }

      console.log(`UnrealizedPnlCalculator result:`, {
        total,
        currentPrice,
        positionsCount: openPositions.length,
      });
      setUnrealizedPnl(total);
    };

    if (openPositions.length > 0) {
      calculatePnl();
    } else {
      setUnrealizedPnl(0);
    }
  }, [openPositions, currentPrice]);

  return unrealizedPnl;
}

interface WindowTitleBarProps {
  roomName: string;
  isPublic: boolean;
  roomType: "regular" | "voice";
  onCloseRoom: () => void;
  onTitleBarMouseDown: (e: React.MouseEvent) => void;
  virtualBalance: number;
  hostId: string;
  roomId: string;
  currentPrice?: number;
  symbol: string;
  setSymbol: (symbol: string) => void;
  initialUpdatedAt: string;
}

export function WindowTitleBar({
  roomName: initialRoomName,
  isPublic: initialIsPublic,
  roomType,
  onCloseRoom,
  onTitleBarMouseDown,
  virtualBalance,
  hostId,
  roomId,
  currentPrice,
  symbol,
  setSymbol,
  initialUpdatedAt,
}: WindowTitleBarProps) {
  const t = useTranslations("room.windowTitleBar");
  // Read hostView via Suspense-safe reader and window fallback to avoid visible loaders
  const [forcedHostView, setForcedHostView] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        new URLSearchParams(window.location.search).get("hostView") === "1"
      );
    }
    return false;
  });

  const ForceHostViewReader: React.FC<{ onValue: (v: boolean) => void }> = ({
    onValue,
  }) => {
    const sp = useSearchParams();
    React.useEffect(() => {
      onValue(sp?.get("hostView") === "1");
    }, [sp, onValue]);
    return null;
  };
  const { isMicOn, toggleMic, currentUserId, roomConnected } =
    useLivektHostAudio({ roomType, hostId, roomId });

  // Only show balance and PnL for the host since only host can trade
  const isHost = forcedHostView || currentUserId === hostId;

  // Chart streaming controls
  const {
    isHost: isChartHost,
    isStreaming,
    error: streamingError,
    startChartStream,
    stopChartStream,
  } = useChartStreaming(roomId, hostId);

  // Broadcast streaming status changes
  useEffect(() => {
    if (!isChartHost) return;

    const supabase = createClient();
    const channel = supabase.channel("room-streaming-status");

    const broadcastStreamingStatus = async (streaming: boolean) => {
      try {
        await channel.send({
          type: "broadcast",
          event: "streaming-status",
          payload: {
            roomId,
            isStreaming: streaming,
          },
        });
        // no-op
      } catch (error) {
        console.error("Failed to broadcast streaming status:", error);
      }
    };

    // Subscribe to the channel
    channel.subscribe();

    // Broadcast initial status
    broadcastStreamingStatus(isStreaming);

    // Broadcast when streaming status changes
    const timeoutId = setTimeout(() => {
      broadcastStreamingStatus(isStreaming);
    }, 1000); // Small delay to ensure streaming state is stable

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [isChartHost, isStreaming, roomId]);

  // Host always streams at highest quality; no dialog needed

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: settings } = useSWR("/api/app-settings", fetcher, {
    fallbackData: { startingBalance: 10000 }, // Provide fallback to prevent loading states
    revalidateOnFocus: false,
    dedupingInterval: 0,
  });
  // const isStartingBalanceLoaded = true; // Always true with fallback
  const startingBalance = settings?.startingBalance || 10000; // Use fallback value

  const showSkeleton = false; // Never show skeleton with fallback data
  const isNoTrades =
    typeof virtualBalance === "number" &&
    !isNaN(virtualBalance) &&
    (virtualBalance === startingBalance || virtualBalance === 0);
  let profitRate = 0 as number;

  const router = useRouter();
  const supabase = useRef(createClient());
  const [showLateJoinWarning, setShowLateJoinWarning] = useState(true);

  // Add local state for editable fields
  const [roomName, setRoomName] = useState(initialRoomName);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState<string | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setRoomName(initialRoomName);
    setIsPublic(initialIsPublic);
    setUpdatedAt(initialUpdatedAt);
  }, [initialRoomName, initialIsPublic, initialUpdatedAt]);

  // Latest reset marker for soft reset scoping
  const { data: latestResetData } = useLatestRoomReset(roomId);
  const sinceResetAt = latestResetData?.latest?.reset_at;

  // Fetch open and closed positions for PNL calculation (closed filtered since reset)
  const { openPositions, closedPositions } = usePositions(roomId, {
    sinceResetAt,
  });

  // Calculate unrealized PNL using symbol-specific prices
  const unrealizedPnl = UnrealizedPnlCalculator({
    openPositions,
    currentPrice,
  });

  // remove debug logs

  // Calculate realized PNL from closed positions (scoped since reset)
  const realizedPnl = useMemo(() => {
    let realized = 0;
    if (Array.isArray(closedPositions)) {
      for (const pos of closedPositions) {
        realized += Number(pos.pnl ?? 0);
      }
    }
    return realized;
  }, [closedPositions]);

  // Baseline for soft-reset display - simplified for instant loading
  const resetBaseline = useMemo(() => {
    const markerVal = latestResetData?.latest?.reset_start_balance;
    const markerNum = markerVal != null ? Number(markerVal) : NaN;
    const fallbackBaseline = startingBalance;
    const baseline =
      !Number.isNaN(markerNum) && markerNum > 0 ? markerNum : fallbackBaseline;

    return baseline;
  }, [latestResetData?.latest?.reset_start_balance, startingBalance]);

  // Displayed virtual balance for UI - simplified for instant loading
  const displayedVirtualBalance = useMemo(() => {
    // Always show data instantly with fallback
    if (typeof virtualBalance === "number" && !isNaN(virtualBalance)) {
      return Math.max(0, virtualBalance);
    }
    return resetBaseline;
  }, [virtualBalance, resetBaseline]);

  // Now that resetBaseline/displayedVirtualBalance are defined, compute profitRate
  profitRate = useMemo(() => {
    if (
      resetBaseline > 0 &&
      !isNaN(displayedVirtualBalance) &&
      !isNaN(resetBaseline)
    ) {
      return ((displayedVirtualBalance - resetBaseline) / resetBaseline) * 100;
    }
    return 0;
  }, [displayedVirtualBalance, resetBaseline]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.current
      .channel("room-status-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new?.room_status === "ended") {
            router.push("/trading");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [roomId, router]);

  const refetchUpdatedAt = async () => {
    const supabaseClient = createClient();
    const { data } = await supabaseClient
      .from("trading_rooms")
      .select("updated_at")
      .eq("id", roomId)
      .maybeSingle();
    if (data && data.updated_at) {
      setUpdatedAt(data.updated_at);
    }
  };

  // Fetch current thumbnail URL
  useEffect(() => {
    const fetchThumbnail = async () => {
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from("trading_rooms")
        .select("thumbnail_url")
        .eq("id", roomId)
        .maybeSingle();
      if (data?.thumbnail_url) {
        setCustomThumbnailUrl(data.thumbnail_url);
      }
    };
    fetchThumbnail();
  }, [roomId]);

  const handleRemoveCustomThumbnail = async () => {
    if (!currentUserId || currentUserId !== hostId) return;

    try {
      const supabaseClient = createClient();

      // Remove the thumbnail URL from the database
      const { error: updateError } = await supabaseClient
        .from("trading_rooms")
        .update({ thumbnail_url: null })
        .eq("id", roomId);

      if (updateError) {
        console.error("Error removing thumbnail URL:", updateError);
        return;
      }

      setCustomThumbnailUrl(null);
      setThumbnailDialogOpen(false);
    } catch (error) {
      console.error("Error removing custom thumbnail:", error);
    }
  };

  const handleFileSelect = (file: File) => {
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    if (!file.type || !file.type.startsWith("image/")) {
      toast.error(t("thumbnail.errors.onlyImages"));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(t("thumbnail.errors.maxSize", { sizeMB: 10 }));
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !currentUserId || currentUserId !== hostId) return;

    setIsUploading(true);
    try {
      const supabaseClient = createClient();
      const fileName = `custom-thumbnail-${roomId}-${Date.now()}.png`;

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabaseClient.storage
        .from("room-thumbnails")
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type || "image/*",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading thumbnail:", uploadError);
        return;
      }

      // Get the public URL
      const { data: urlData } = supabaseClient.storage
        .from("room-thumbnails")
        .getPublicUrl(fileName);

      const thumbnailUrl = urlData.publicUrl;

      // Update the room's thumbnail URL in the database
      const { error: updateError } = await supabaseClient
        .from("trading_rooms")
        .update({ thumbnail_url: thumbnailUrl })
        .eq("id", roomId);

      if (updateError) {
        console.error("Error updating thumbnail URL:", updateError);
        return;
      }

      setCustomThumbnailUrl(thumbnailUrl);
      setThumbnailDialogOpen(false);
      // Keep the preview to show the uploaded image
      // setSelectedFile(null);
      // setPreviewUrl(null);
    } catch (error) {
      console.error("Error uploading custom thumbnail:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setThumbnailDialogOpen(false);
  };

  const handleRefreshThumbnail = async () => {
    try {
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from("trading_rooms")
        .select("thumbnail_url")
        .eq("id", roomId)
        .maybeSingle();
      if (data?.thumbnail_url) {
        setCustomThumbnailUrl(data.thumbnail_url);
      }
    } catch (error) {
      console.error("Error refreshing thumbnail:", error);
    }
  };

  return (
    <div className="px-3 pt-2">
      {/* Suspense-safe hostView reader with empty fallback to avoid loaders in screenshots */}
      <Suspense fallback={<></>}>
        <ForceHostViewReader onValue={setForcedHostView} />
      </Suspense>
      <div
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between h-auto lg:h-14 px-4 py-3 lg:py-0 border bg-muted/30 select-none gap-3 lg:gap-0"
        onMouseDown={onTitleBarMouseDown}
      >
        {/* Window Title */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-6 h-6 bg-gradient-to-br from-[#c3e3fa] via-[#63b3e4] to-[#7cc3f0] rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1 lg:flex-initial">
            <span className="font-medium text-sm truncate max-w-[200px] sm:max-w-[300px] lg:max-w-none">
              {roomName}
            </span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="align-middle cursor-pointer pointer-events-auto">
                    {isPublic ? (
                      <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  {isPublic ? t("public") : t("private")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Edit Room Button ONLY for Creator */}
            {currentUserId === hostId && (
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <span className="align-middle cursor-pointer pointer-events-auto">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <PencilIcon className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center">
                          {t("edit.tooltip")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="select-none">
                      {t("edit.title")}
                    </DialogTitle>
                    <DialogDescription className="select-none">
                      {t("edit.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <Separator className="my-0" />
                  <EditRoomForm
                    roomId={roomId}
                    initialName={roomName}
                    initialPrivacy={isPublic ? "public" : "private"}
                    initialSymbol={symbol}
                    initialUpdatedAt={updatedAt}
                    onRoomUpdated={async ({
                      name,
                      privacy,
                      symbol: newSymbol,
                      updatedAt: newUpdatedAt,
                    }) => {
                      setRoomName(name);
                      setIsPublic(privacy === "public");
                      setSymbol(newSymbol);
                      setEditDialogOpen(false);
                      await refetchUpdatedAt();
                    }}
                    onCancel={() => setEditDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}

            {/* Custom Thumbnail Upload Button ONLY for Creator */}
            {currentUserId === hostId && (
              <Dialog
                open={thumbnailDialogOpen}
                onOpenChange={setThumbnailDialogOpen}
              >
                <DialogTrigger asChild>
                  <span className="align-middle cursor-pointer pointer-events-auto">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <ImageIcon className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center">
                          {customThumbnailUrl
                            ? t("thumbnail.tooltip.change")
                            : t("thumbnail.tooltip.upload")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {customThumbnailUrl
                        ? t("thumbnail.title.change")
                        : t("thumbnail.title.upload")}
                    </DialogTitle>
                    <DialogDescription>
                      {customThumbnailUrl
                        ? t("thumbnail.description.change")
                        : t("thumbnail.description.upload")}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label
                        htmlFor="thumbnail"
                        className="text-sm font-medium"
                      >
                        {customThumbnailUrl
                          ? t("thumbnail.labels.newThumbnail")
                          : t("thumbnail.labels.selectImage")}
                      </label>
                      <input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelect(file);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isUploading}
                      />
                    </div>

                    {/* Preview of selected file */}
                    {previewUrl && (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          {t("thumbnail.labels.preview")}
                        </label>
                        <div className="relative">
                          <Image
                            src={previewUrl}
                            alt={t("thumbnail.labels.preview")}
                            width={400}
                            height={288}
                            className="w-full h-72 object-cover rounded-md border"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 h-8 w-8 p-0"
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Current thumbnail preview */}
                    {customThumbnailUrl && !previewUrl && (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          {t("thumbnail.labels.currentThumbnail")}
                        </label>
                        <div className="relative">
                          <Image
                            src={customThumbnailUrl}
                            alt={t("thumbnail.labels.currentThumbnail")}
                            width={400}
                            height={288}
                            className="w-full h-72 object-cover rounded-md border"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleRefreshThumbnail}
                              className="h-8 w-8 p-0"
                            >
                              <RefreshCwIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleRemoveCustomThumbnail}
                              disabled={isUploading}
                              className="h-8 w-8 p-0"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={handleCancelUpload}
                      disabled={isUploading}
                    >
                      {t("thumbnail.buttons.cancel")}
                    </Button>
                    <Button
                      onClick={handleConfirmUpload}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading
                        ? t("thumbnail.buttons.uploading")
                        : t("thumbnail.buttons.confirmUpload")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Late join audio warning for participants */}
        {roomType === "voice" &&
          currentUserId &&
          currentUserId !== hostId &&
          showLateJoinWarning && (
            <div className="w-full lg:flex-1 mx-0 lg:mx-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm flex items-center justify-between">
              <span className="truncate text-xs lg:text-sm">
                🔊 {t("lateJoin.warningText")}
              </span>
              <button
                onClick={() => setShowLateJoinWarning(false)}
                className="ml-2 text-yellow-700 hover:text-yellow-900 font-bold flex-shrink-0 cursor-pointer"
                aria-label={t("lateJoin.dismiss")}
              >
                ×
              </button>
            </div>
          )}

        {/* Window Controls */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 lg:gap-4 pointer-events-auto w-full lg:w-auto justify-start lg:justify-end">
          {/* Chart Streaming Controls - Only for Host */}
          {isChartHost && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (isStreaming) {
                          stopChartStream();
                        } else {
                          // Start immediately at highest quality
                          startChartStream();
                        }
                      }}
                      variant={isStreaming ? "destructive" : "default"}
                      className={cn(
                        isStreaming
                          ? "bg-red-50 hover:bg-red-100 text-red-600"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                      )}
                    >
                      {isStreaming ? (
                        <VideoOff className="h-4 w-4" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    <div className="text-center">
                      <div>
                        {isStreaming ? t("stream.stop") : t("stream.start")}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {isStreaming
                          ? t("stream.sharing")
                          : t("stream.shareHint")}
                      </div>
                      {streamingError && (
                        <div className="text-xs text-red-400 mt-1">
                          {t("stream.errorPrefix")} {streamingError}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Start stream immediately at highest quality */}
              {false && <div />}
            </>
          )}

          {/* Only for Voice Rooms, and only for the creator */}
          {roomType === "voice" && currentUserId === hostId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={toggleMic}
                    disabled={!roomConnected}
                    className={cn(
                      isMicOn
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        : "bg-red-50 hover:bg-red-100 text-red-600"
                    )}
                  >
                    {isMicOn ? (
                      <MicIcon className="h-4 w-4" />
                    ) : (
                      <MicOffIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  {isMicOn ? t("mic.mute") : t("mic.unmute")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Show warning button when dismissed */}
          {currentUserId &&
            currentUserId !== hostId &&
            !showLateJoinWarning && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowLateJoinWarning(true)}
                    >
                      <Volume2Icon className="h-4 w-4" />
                      <span>{t("audioHelp.button")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    {t("audioHelp.tooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

          <Donation creatorId={hostId} roomId={roomId} key={roomId} />

          {/* Virtual Currency - Only show for host */}
          {isHost && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0">
              <span className="text-xs lg:text-sm font-medium text-muted-foreground whitespace-nowrap">
                {t("labels.virtualBalance")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {showSkeleton ? (
                      <Skeleton className="h-4 lg:h-5 w-16 lg:w-20 inline-block align-middle" />
                    ) : (
                      <span className="text-xs lg:text-sm font-semibold cursor-help truncate">
                        $
                        {Math.max(0, displayedVirtualBalance)?.toLocaleString(
                          "en-US"
                        ) ?? "-"}
                      </span>
                    )}
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="center"
                    className="select-none"
                  >
                    <div className="flex flex-col gap-1 min-w-[220px]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs">{t("pnl.unrealized")}</span>
                        <span
                          className={`text-xs font-semibold ${
                            unrealizedPnl > 0
                              ? "text-green-600"
                              : unrealizedPnl < 0
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {unrealizedPnl >= 0 ? "+" : ""}
                          {unrealizedPnl.toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {t("pnl.usdt")}
                          {startingBalance > 0 && (
                            <>
                              {" ("}
                              {unrealizedPnl >= 0 ? "+" : "-"}
                              {Math.abs(
                                (unrealizedPnl / startingBalance) * 100
                              ).toFixed(2)}
                              %{")"}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs">{t("pnl.realized")}</span>
                        <span
                          className={`text-xs font-semibold ${
                            realizedPnl > 0
                              ? "text-green-600"
                              : realizedPnl < 0
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {realizedPnl >= 0 ? "+" : ""}
                          {realizedPnl.toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {t("pnl.usdt")}
                          {startingBalance > 0 && (
                            <>
                              {" ("}
                              {realizedPnl >= 0 ? "+" : "-"}
                              {Math.abs(
                                (realizedPnl / startingBalance) * 100
                              ).toFixed(2)}
                              %{")"}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Cummulative Profit rate - Only show for host */}
          {isHost && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0">
              <span className="text-xs lg:text-sm font-medium text-muted-foreground whitespace-nowrap">
                {t("profitRate.cumulative")}
              </span>
              {showSkeleton ? (
                <Skeleton className="h-4 lg:h-5 w-12 lg:w-16 inline-block align-middle" />
              ) : isNoTrades ? (
                <span className="text-xs lg:text-sm font-semibold">0.00%</span>
              ) : (
                <span className="text-xs lg:text-sm font-semibold">
                  {isNaN(profitRate)
                    ? "0.00%"
                    : `${profitRate >= 0 ? "+" : ""}${profitRate.toFixed(2)}%`}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-1 w-full sm:w-auto">
            {/* Close Room Button */}
            {currentUserId === hostId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="h-7 lg:h-8 text-xs lg:text-sm w-full sm:w-auto"
                  >
                    {t("closeRoom.button")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("closeRoom.dialog.title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("closeRoom.dialog.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await supabase.current
                          .from("trading_rooms")
                          .update({ room_status: "ended" })
                          .eq("id", roomId);
                        router.push("/trading");
                        if (onCloseRoom) onCloseRoom();
                      }}
                      className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
                    >
                      {t("closeRoom.button")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              variant="destructive"
              className="h-7 lg:h-8 text-xs lg:text-sm w-full sm:w-auto"
              onClick={async () => {
                if (!currentUserId) return;

                try {
                  // Remove user from room participants
                  const { error } = await supabase.current
                    .from("trading_room_participants")
                    .update({ left_at: new Date().toISOString() })
                    .eq("room_id", roomId)
                    .eq("user_id", currentUserId)
                    .is("left_at", null);

                  if (error) {
                    console.error("Error leaving room:", error);
                    toast.error(t("leaveRoom.failed"));
                    return;
                  }

                  // Redirect to trading page
                  router.push("/trading");
                  if (onCloseRoom) onCloseRoom();
                } catch (error) {
                  console.error("Error leaving room:", error);
                  toast.error(t("leaveRoom.failed"));
                }
              }}
            >
              <LogOutIcon className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="sr-only">{t("leaveRoom.sr")}</span>
              <span className="hidden sm:inline">{t("leaveRoom.full")}</span>
              <span className="sm:hidden">{t("leaveRoom.short")}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
