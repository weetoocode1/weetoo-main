"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useLivektHostAudio } from "@/hooks/use-livekt-host-audio";
import { usePositions } from "@/hooks/use-positions";
import { cn } from "@/lib/utils";
import {
  GlobeIcon,
  LockIcon,
  MicIcon,
  MicOffIcon,
  PencilIcon,
  Volume2Icon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import { EditRoomForm } from "./edit-room";

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

  useEffect(() => {
    setRoomName(initialRoomName);
    setIsPublic(initialIsPublic);
    setUpdatedAt(initialUpdatedAt);
  }, [initialRoomName, initialIsPublic, initialUpdatedAt]);

  // Fetch open and closed positions for PNL calculation
  const { openPositions, closedPositions } = usePositions(roomId);

  // Memoized calculation of unrealized and realized PNL
  const { unrealizedPnl, realizedPnl } = useMemo(() => {
    let unrealized = 0;
    let realized = 0;
    if (Array.isArray(openPositions) && typeof currentPrice === "number") {
      for (const pos of openPositions) {
        const entry = Number(pos.entry_price);
        const qty = Number(pos.quantity);
        const side = (pos.side ?? "").toLowerCase();
        if (side === "long") {
          unrealized += (currentPrice - entry) * qty;
        } else if (side === "short") {
          unrealized += (entry - currentPrice) * qty;
        }
      }
    }
    if (Array.isArray(closedPositions)) {
      for (const pos of closedPositions) {
        realized += Number(pos.pnl ?? 0);
      }
    }
    return { unrealizedPnl: unrealized, realizedPnl: realized };
  }, [openPositions, closedPositions, currentPrice]);

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

  return (
    <div className="px-3 pt-2">
      <div
        className="flex items-center justify-between h-14 px-4 border bg-muted/30 select-none"
        onMouseDown={onTitleBarMouseDown}
      >
        {/* Window Title */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-[#c3e3fa] via-[#63b3e4] to-[#7cc3f0] rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[200px] sm:max-w-none">
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
          </div>
        </div>

        {/* Late join audio warning for participants */}
        {roomType === "voice" &&
          currentUserId &&
          currentUserId !== hostId &&
          showLateJoinWarning && (
            <div className="flex-1 mx-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm flex items-center justify-between">
              <span className="truncate">
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
        <div className="flex items-center gap-4 pointer-events-auto">
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
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              Virtual Balance:
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-semibold cursor-help">
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
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              Cumulative Profit Rate:
            </span>
            {showSkeleton ? (
              <Skeleton className="h-5 w-16 inline-block align-middle" />
            ) : isNoTrades ? (
              <span className="text-sm font-semibold">0.00%</span>
            ) : (
              <span className="text-sm font-semibold">
                {profitRate >= 0 ? "+" : ""}
                {profitRate.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Close Room Button */}
          {currentUserId === hostId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="h-8">
                  Close Room
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close Room</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to close this room? This action cannot
                    be undone.
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
        </div>
      </div>
    </div>
  );
}
