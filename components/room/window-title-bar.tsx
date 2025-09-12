"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { Donation } from "@/components/room/donation";
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
import { EditRoomForm } from "./edit-room";

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
}: {
  openPositions: TradingPosition[];
}) {
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);

  useEffect(() => {
    const calculatePnl = async () => {
      let total = 0;

      for (const pos of openPositions) {
        const entry = Number(pos.entry_price);
        const qty = Number(pos.quantity);
        const side = (pos.side ?? "").toLowerCase();

        // Fetch current price for this position's symbol
        try {
          const response = await fetch(
            `https://api.binance.us/api/v3/ticker/24hr?symbol=${pos.symbol}`
          );
          if (response.ok) {
            const data = await response.json();
            const currentPrice = parseFloat(data.lastPrice);

            if (side === "long") {
              total += (currentPrice - entry) * qty;
            } else if (side === "short") {
              total += (entry - currentPrice) * qty;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch price for ${pos.symbol}:`, error);
        }
      }

      setUnrealizedPnl(total);
    };

    if (openPositions.length > 0) {
      calculatePnl();
    } else {
      setUnrealizedPnl(0);
    }
  }, [openPositions]);

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
  const { isMicOn, toggleMic, currentUserId, roomConnected } =
    useLivektHostAudio({ roomType, hostId, roomId });

  // Chart streaming controls
  const {
    isHost: isChartHost,
    isStreaming,
    error: streamingError,
    startChartStream,
    stopChartStream,
  } = useChartStreaming(roomId, hostId);

  // Host always streams at highest quality; no dialog needed

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: settings } = useSWR("/api/app-settings", fetcher);
  const isStartingBalanceLoaded =
    settings && typeof settings.startingBalance === "number";

  const showSkeleton =
    !isStartingBalanceLoaded ||
    typeof virtualBalance !== "number" ||
    isNaN(virtualBalance);
  const isNoTrades =
    isStartingBalanceLoaded &&
    typeof virtualBalance === "number" &&
    !isNaN(virtualBalance) &&
    (virtualBalance === settings.startingBalance || virtualBalance === 0);
  const profitRate =
    isStartingBalanceLoaded &&
    typeof virtualBalance === "number" &&
    !isNaN(virtualBalance) &&
    settings.startingBalance > 0
      ? ((virtualBalance - settings.startingBalance) /
          settings.startingBalance) *
        100
      : 0;

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

  // Fetch open and closed positions for PNL calculation
  const { openPositions, closedPositions } = usePositions(roomId);

  // Calculate unrealized PNL using symbol-specific prices
  const unrealizedPnl = UnrealizedPnlCalculator({ openPositions });

  // Calculate realized PNL from closed positions
  const realizedPnl = useMemo(() => {
    let realized = 0;
    if (Array.isArray(closedPositions)) {
      for (const pos of closedPositions) {
        realized += Number(pos.pnl ?? 0);
      }
    }
    return realized;
  }, [closedPositions]);

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
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be 10MB or smaller");
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
                  {isPublic ? "Public" : "Private"}
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
                          Edit Room
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="select-none">
                      Edit Room Settings
                    </DialogTitle>
                    <DialogDescription className="select-none">
                      Edit the room name, symbol, and privacy settings.
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
                            ? "Change Custom Thumbnail"
                            : "Upload Custom Thumbnail"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {customThumbnailUrl
                        ? "Change Room Thumbnail"
                        : "Upload Room Thumbnail"}
                    </DialogTitle>
                    <DialogDescription>
                      {customThumbnailUrl
                        ? "Upload a new image to replace the current thumbnail, or remove it to use automatic screenshots."
                        : "Upload a custom thumbnail image. This will disable automatic screenshots for this room."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label
                        htmlFor="thumbnail"
                        className="text-sm font-medium"
                      >
                        {customThumbnailUrl ? "New Thumbnail" : "Select Image"}
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
                        <label className="text-sm font-medium">Preview</label>
                        <div className="relative">
                          <Image
                            src={previewUrl}
                            alt="Preview"
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
                          Current Thumbnail
                        </label>
                        <div className="relative">
                          <Image
                            src={customThumbnailUrl}
                            alt="Current thumbnail"
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
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmUpload}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? "Uploading..." : "Confirm Upload"}
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
                🔊 Having trouble hearing the host? Ask Host to toggle their
                microphone off and on again
              </span>
              <button
                onClick={() => setShowLateJoinWarning(false)}
                className="ml-2 text-yellow-700 hover:text-yellow-900 font-bold flex-shrink-0 cursor-pointer"
                aria-label="Dismiss"
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
                        {isStreaming
                          ? "Stop Chart Stream"
                          : "Start Chart Stream"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {isStreaming
                          ? "Sharing current tab"
                          : "Share current tab with participants"}
                      </div>
                      {streamingError && (
                        <div className="text-xs text-red-400 mt-1">
                          Error: {streamingError}
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
                  {isMicOn ? "Mute microphone" : "Unmute microphone"}
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
                      <span>Audio Issues Help</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    Show audio help
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

          <Donation creatorId={hostId} roomId={roomId} key={roomId} />

          {/* Virtual Currency */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0">
            <span className="text-xs lg:text-sm font-medium text-muted-foreground whitespace-nowrap">
              Virtual Balance:
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs lg:text-sm font-semibold cursor-help truncate">
                    $
                    {Math.max(0, virtualBalance)?.toLocaleString("en-US") ??
                      "-"}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="select-none"
                >
                  <div className="flex flex-col gap-1 min-w-[220px]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Unrealized PNL</span>
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
                        USDT
                        {isStartingBalanceLoaded &&
                          settings.startingBalance > 0 && (
                            <>
                              {" ("}
                              {unrealizedPnl >= 0 ? "+" : "-"}
                              {Math.abs(
                                (unrealizedPnl / settings.startingBalance) * 100
                              ).toFixed(2)}
                              %{")"}
                            </>
                          )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Realized PNL</span>
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
                        USDT
                        {isStartingBalanceLoaded &&
                          settings.startingBalance > 0 && (
                            <>
                              {" ("}
                              {realizedPnl >= 0 ? "+" : "-"}
                              {Math.abs(
                                (realizedPnl / settings.startingBalance) * 100
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

          {/* Cummulative Profit rate*/}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0">
            <span className="text-xs lg:text-sm font-medium text-muted-foreground whitespace-nowrap">
              Cumulative Profit Rate:
            </span>
            {showSkeleton ? (
              <Skeleton className="h-4 lg:h-5 w-12 lg:w-16 inline-block align-middle" />
            ) : isNoTrades ? (
              <span className="text-xs lg:text-sm font-semibold">0.00%</span>
            ) : (
              <span className="text-xs lg:text-sm font-semibold">
                {profitRate >= 0 ? "+" : ""}
                {profitRate.toFixed(2)}%
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-1 w-full sm:w-auto">
            {/* Close Room Button */}
            {currentUserId === hostId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="h-7 lg:h-8 text-xs lg:text-sm w-full sm:w-auto"
                  >
                    Close Room
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close Room</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to close this room? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                      Close Room
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
                    toast.error("Failed to leave room");
                    return;
                  }

                  // Redirect to trading page
                  router.push("/trading");
                  if (onCloseRoom) onCloseRoom();
                } catch (error) {
                  console.error("Error leaving room:", error);
                  toast.error("Failed to leave room");
                }
              }}
            >
              <LogOutIcon className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="sr-only">Leave Room</span>
              <span className="hidden sm:inline">Leave Room</span>
              <span className="sm:hidden">Leave</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
