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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";
import {
  DoorClosedIcon,
  GlobeIcon,
  LockIcon,
  LogOutIcon,
  PencilIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Consistent number formatting function to prevent hydration mismatches
const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

interface Room {
  id: string;
  name: string;
  creator_id: string;
  symbol: string;
  category: string;
  privacy: string;
  is_active: boolean;
  room_status: string;
  virtual_balance: number;
  updated_at: string;
}

interface Position {
  pnl?: number;
  closed_at?: string;
}

interface RealtimePayload {
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
}

interface RoomHeaderProps {
  room: Room;
  onRoomUpdate?: (updatedRoom: Partial<Room>) => void;
  onCloseRoom?: () => void;
}

export function RoomHeader({
  room,
  onRoomUpdate,
  onCloseRoom,
}: RoomHeaderProps) {
  const t = useTranslations("room.header");
  const [roomName, setRoomName] = useState(room.name);
  const [roomType, setRoomType] = useState(room.privacy);
  const [selectedSymbol, setSelectedSymbol] = useState(room.symbol);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [, setIsDonationsDialogOpen] = useState(false);
  const [existingRoomNames, setExistingRoomNames] = useState<string[]>([]);
  // const [isValidatingRoomName, setIsValidatingRoomName] = useState(false);
  const [roomNameError, setRoomNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationTimeout, setValidationTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Update local state when room data changes, but only if dialog is closed
  useEffect(() => {
    if (!isEditDialogOpen) {
      setRoomName(room.name);
      setRoomType(room.privacy);
      setSelectedSymbol(room.symbol);
    }
  }, [room.name, room.privacy, room.symbol, isEditDialogOpen]);

  // Fetch existing room names when dialog opens
  const fetchExistingRoomNames = async () => {
    try {
      const response = await fetch("/api/trading-rooms/names");
      if (response.ok) {
        const data = await response.json();
        setExistingRoomNames(data.names || []);
      }
    } catch (error) {
      console.error("Failed to fetch existing room names:", error);
    }
  };

  // Validate room name
  const validateRoomName = (name: string): boolean => {
    if (!name.trim()) {
      setRoomNameError(t("errors.nameRequired"));
      return false;
    }

    if (name.trim() === room.name) {
      setRoomNameError(null); // Same name as current room is allowed
      return true;
    }

    if (existingRoomNames.includes(name.trim())) {
      setRoomNameError(t("errors.nameExists"));
      return false;
    }

    setRoomNameError(null);
    return true;
  };

  // Handle room name change with debounced validation
  const handleRoomNameChange = (value: string) => {
    setRoomName(value);

    // Clear previous timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Clear error if user reverts to original name
    if (value.trim() === room.name) {
      setRoomNameError(null);
      return;
    }

    // Debounced validation - only validate after user stops typing for 300ms
    const timeout = setTimeout(() => {
      if (
        value.trim() &&
        existingRoomNames.length > 0 &&
        value.trim() !== room.name
      ) {
        validateRoomName(value);
      }
    }, 300);

    setValidationTimeout(timeout);
  };

  const handleDialogOpenChange = async (open: boolean) => {
    if (open) {
      await fetchExistingRoomNames();
    } else {
      setRoomName(room.name);
      setRoomType(room.privacy);
      setSelectedSymbol(room.symbol);
      setRoomNameError(null);
      setSaveError(null);
    }
    setIsEditDialogOpen(open);
  };

  useEffect(() => {
    if (isEditDialogOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditDialogOpen]);

  // const donations = [
  //   { name: "Alex Johnson", amount: "$25.00" },
  //   { name: "Maria Lee", amount: "$10.00" },
  //   { name: "K. Park", amount: "$5.00" },
  // ];

  // Live stats - Ensure virtual balance never goes negative (minimum is 0)
  const [virtualBalanceUsd, setVirtualBalanceUsd] = useState<number>(
    Math.max(0, Number(room.virtual_balance || 0))
  );
  const [cumulativeProfitRatePct, setCumulativeProfitRatePct] =
    useState<number>(0);
  const initialBalanceRef = useRef<number>(Number(room.virtual_balance || 0));
  const supabase = createClient();
  const router = useRouter();

  const refreshCumulative = useCallback(async () => {
    // Sum realized PnL from all closed positions
    const { data: positions } = await supabase
      .from("trading_room_positions")
      .select("pnl, closed_at")
      .eq("room_id", room.id)
      .not("closed_at", "is", null);

    const realized = (positions || []).reduce(
      (sum, r: Position) => sum + Number(r.pnl || 0),
      0
    );

    // Compute current equity to derive starting balance if needed
    const { data: roomRow } = await supabase
      .from("trading_rooms")
      .select("virtual_balance")
      .eq("id", room.id)
      .single();

    const currentBalance = Number(roomRow?.virtual_balance ?? 0);

    // If we never captured a base, approximate it as current - realized PnL
    if (!initialBalanceRef.current) {
      initialBalanceRef.current = currentBalance - realized;
    }

    const base = initialBalanceRef.current || 0;
    const rate = base > 0 ? (realized / base) * 100 : 0;
    setCumulativeProfitRatePct(rate);
  }, [room.id, supabase]);

  useEffect(() => {
    // Realtime updates for room balance and realized PnL
    const channel = supabase
      .channel("room-header-" + room.id)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload: RealtimePayload) => {
          const vb = Number(payload.new?.virtual_balance);
          if (!Number.isNaN(vb)) {
            // Ensure virtual balance never goes negative (minimum is 0)
            setVirtualBalanceUsd(Math.max(0, vb));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_room_positions",
          filter: `room_id=eq.${room.id}`,
        },
        (payload: RealtimePayload) => {
          // Recompute cumulative only when position just closed
          const wasOpen = payload.old?.closed_at == null;
          const nowClosed = payload.new?.closed_at != null;
          if (wasOpen && nowClosed) {
            refreshCumulative();
          }
        }
      )
      .subscribe();

    // Initial compute
    refreshCumulative();
    // Ensure virtual balance never goes negative (minimum is 0)
    setVirtualBalanceUsd(Math.max(0, Number(room.virtual_balance || 0)));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, room.virtual_balance, refreshCumulative, supabase]);

  const handleSave = async () => {
    // Validate room name before saving
    if (!validateRoomName(roomName)) {
      return; // Don't save if validation fails
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/trading-rooms/${room.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName.trim(),
          privacy: roomType,
          symbol: selectedSymbol,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.updateFailed"));
      }

      // Update local state immediately for instant UI feedback
      setRoomName(data.room.name);
      setRoomType(data.room.privacy);
      setSelectedSymbol(data.room.symbol);

      // Notify parent component of the update
      if (onRoomUpdate) {
        onRoomUpdate(data.room);
      }

      // Close dialog on success
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving room:", error);
      setSaveError(
        error instanceof Error ? error.message : t("errors.saveFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setRoomName(room.name);
    setRoomType(room.privacy);
    setSelectedSymbol(room.symbol);
    setIsEditDialogOpen(false);
  };

  // Keyboard shortcuts for dialogs
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingContext =
        tag === "input" || tag === "textarea" || target?.isContentEditable;

      // Edit Room: Ctrl/Cmd + Shift + E
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "e" &&
        !isTypingContext
      ) {
        event.preventDefault();
        console.log("Edit dialog shortcut triggered");
        setIsEditDialogOpen(true);
      }

      // Donations: Ctrl/Cmd + Shift + D (use event.code to ignore layout)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        (event.key.toLowerCase() === "d" || event.code === "KeyD") &&
        !isTypingContext &&
        !event.repeat
      ) {
        event.preventDefault();
        event.stopPropagation();
        console.log("Donations dialog shortcut triggered");
        setIsDonationsDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="w-full lg:h-[50px] h-auto flex flex-col lg:flex-row items-center border border-border rounded-none text-sm px-3 flex-shrink-0 py-2 lg:py-0">
      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-md font-semibold">{roomName}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {roomType === "public" ? (
                    <GlobeIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <LockIcon className="size-4 text-muted-foreground" />
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span>
                    {roomType === "public"
                      ? t("labels.publicRoom")
                      : t("labels.privateRoom")}
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="align-middle cursor-pointer pointer-events-auto"
                  onClick={() => handleDialogOpenChange(true)}
                >
                  <PencilIcon className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                <div className="flex flex-col items-center gap-0.5">
                  <span>{t("edit.tooltip")}</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {navigator.platform.toLowerCase().includes("mac")
                      ? t("edit.shortcutMac")
                      : t("edit.shortcutWin")}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isEditDialogOpen && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              onClick={() => handleDialogOpenChange(false)}
            >
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />

              <div
                className="relative z-[9999] w-full max-w-lg mx-4 bg-background border border-border rounded-lg p-6 shadow-lg animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-0 mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{t("edit.title")}</h2>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => handleDialogOpenChange(false)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-border cursor-pointer"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {saveError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {saveError}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="room-name">{t("form.roomName")}</Label>
                        <Input
                          id="room-name"
                          value={roomName}
                          onChange={(e) => handleRoomNameChange(e.target.value)}
                          placeholder={t("form.roomNamePlaceholder")}
                          className={`h-10 ${
                            roomNameError
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }`}
                        />
                        {roomNameError && (
                          <p className="text-sm text-red-500">
                            {roomNameError}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="room-type">{t("form.roomType")}</Label>
                        <Select value={roomType} onValueChange={setRoomType}>
                          <SelectTrigger className="h-10">
                            <SelectValue
                              placeholder={t("form.roomTypePlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center gap-2">
                                <GlobeIcon className="h-4 w-4" />
                                {t("labels.public")}
                              </div>
                            </SelectItem>
                            <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <LockIcon className="h-4 w-4" />
                                {t("labels.private")}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trading-symbol">
                        {t("form.tradingSymbol")}
                      </Label>
                      <Select
                        value={selectedSymbol}
                        onValueChange={setSelectedSymbol}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue
                            placeholder={t("form.tradingSymbolPlaceholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {TRADING_SYMBOLS.map((symbol) => (
                            <SelectItem key={symbol.value} value={symbol.value}>
                              <div className="flex items-center gap-2">
                                <span>{symbol.label}</span>
                                {symbol.isNew && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-sm">
                                    {t("labels.new")}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="h-10 bg-transparent"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!!roomNameError || !roomName.trim() || isSaving}
                      className="h-10"
                    >
                      {isSaving ? t("common.saving") : t("common.saveChanges")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex items-center gap-2">
        <Button
          variant="outline"
          className="rounded-md h-9 !bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-600"
          asChild
        >
          <Link href={`/trading-room/${room.id}/stream`}>
            <span className="inline-flex items-center">
              <VideoIcon className="size-4" />
            </span>
          </Link>
        </Button>
        <span className="sr-only">{t("sr.startLiveStream")}</span>

        {/* <Dialog
          open={isDonationsDialogOpen}
          onOpenChange={setIsDonationsDialogOpen}
        >
          <DialogTrigger asChild>
            <span className="align-middle cursor-pointer pointer-events-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button className="rounded-md h-9">Donations</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>Donations</span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {navigator.platform.toLowerCase().includes("mac")
                          ? "⌘ + ⌥ + D"
                          : "Ctrl + Shift + D"}
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Donations</DialogTitle>
              <DialogDescription>
                Recent supporter contributions for this room
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              <div className="grid grid-cols-12 items-center px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <span className="col-span-8 text-left">Donor</span>
                <span className="col-span-4 text-right">Amount</span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {donations.map((donation, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-center px-3 py-2 hover:bg-muted/50 rounded-sm"
                  >
                    <span className="col-span-8 font-medium text-left">
                      {donation.name}
                    </span>
                    <span className="col-span-4 text-right tabular-nums text-green-600 font-medium">
                      {donation.amount}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 items-center px-3 py-2 text-sm border-t">
                <span className="col-span-8 font-medium text-left">Total</span>
                <span className="col-span-4 text-right tabular-nums text-green-600 font-semibold">
                  $40.00
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog> */}

        {/* Stats: Virtual Balance and Cumulative Profit Rate - Desktop */}
        <div className="hidden lg:flex items-center gap-3 ml-1 whitespace-nowrap">
          <span className="text-muted-foreground">
            {t("stats.virtualBalance")}
          </span>
          <span className="font-semibold tabular-nums">
            {"$"}
            {formatNumber(virtualBalanceUsd)}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            {t("stats.cumulativeProfit")}
          </span>
          <span
            className={`font-semibold tabular-nums ${
              cumulativeProfitRatePct > 0
                ? "text-profit"
                : cumulativeProfitRatePct < 0
                ? "text-loss"
                : "text-muted-foreground"
            }`}
          >
            {cumulativeProfitRatePct.toFixed(2)}%
          </span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="rounded-md h-9">
              <DoorClosedIcon className="size-4" />
              {t("actions.closeRoom")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("closeDialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("closeDialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-md">
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await supabase
                    .from("trading_rooms")
                    .update({ room_status: "ended" })
                    .eq("id", room.id);
                  router.push("/trading");
                  if (onCloseRoom) onCloseRoom();
                }}
                className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-md"
              >
                {t("actions.closeRoom")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="destructive"
          className="rounded-md h-9"
          onClick={async () => {
            try {
              // Remove user from room participants
              const { error } = await supabase
                .from("trading_room_participants")
                .update({ left_at: new Date().toISOString() })
                .eq("room_id", room.id)
                .eq("user_id", room.creator_id)
                .is("left_at", null);

              if (error) {
                console.error("Error leaving room:", error);
                toast.error(t("toasts.leaveFailed"));
                return;
              }

              // Redirect to trading page
              router.push("/trading");
              if (onCloseRoom) onCloseRoom();
            } catch (error) {
              console.error("Error leaving room:", error);
              toast.error(t("toasts.leaveFailed"));
            }
          }}
        >
          <LogOutIcon className="size-4" />
          {t("actions.leaveRoom")}
        </Button>
      </div>

      {/* Mobile/Tablet Layout - Stacked */}
      <div className="flex flex-col lg:hidden w-full gap-2">
        {/* Top Row: Room Info and Stats */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{roomName}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {roomType === "public" ? (
                      <GlobeIcon className="size-3 text-muted-foreground" />
                    ) : (
                      <LockIcon className="size-3 text-muted-foreground" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span>
                      {roomType === "public"
                        ? t("labels.publicRoom")
                        : t("labels.privateRoom")}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="align-middle cursor-pointer pointer-events-auto"
                    onClick={() => handleDialogOpenChange(true)}
                  >
                    <PencilIcon className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Edit Room</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {navigator.platform.toLowerCase().includes("mac")
                        ? "⌘ + Shift + E"
                        : "Ctrl + Shift + E"}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isEditDialogOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                onClick={() => handleDialogOpenChange(false)}
              >
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />

                <div
                  className="relative z-[9999] w-full max-w-lg mx-4 bg-background border border-border rounded-lg p-6 shadow-lg animate-in fade-in-0 zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-0 mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Edit Room</h2>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => handleDialogOpenChange(false)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-border cursor-pointer"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-5">
                    {saveError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {saveError}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="room-name-mobile">Room Name</Label>
                          <Input
                            id="room-name-mobile"
                            value={roomName}
                            onChange={(e) =>
                              handleRoomNameChange(e.target.value)
                            }
                            placeholder="Enter room name"
                            className={`h-10 ${
                              roomNameError
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }`}
                          />
                          {roomNameError && (
                            <p className="text-sm text-red-500">
                              {roomNameError}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="room-type-mobile">Room Type</Label>
                          <Select value={roomType} onValueChange={setRoomType}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">
                                <div className="flex items-center gap-2">
                                  <GlobeIcon className="h-4 w-4" />
                                  Public
                                </div>
                              </SelectItem>
                              <SelectItem value="private">
                                <div className="flex items-center gap-2">
                                  <LockIcon className="h-4 w-4" />
                                  Private
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="trading-symbol-mobile">
                          Trading Symbol
                        </Label>
                        <Select
                          value={selectedSymbol}
                          onValueChange={setSelectedSymbol}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select trading symbol" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRADING_SYMBOLS.map((symbol) => (
                              <SelectItem
                                key={symbol.value}
                                value={symbol.value}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{symbol.label}</span>
                                  {symbol.isNew && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-sm">
                                      NEW
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="h-10 bg-transparent"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={
                          !!roomNameError || !roomName.trim() || isSaving
                        }
                        className="h-10"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Stats */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t("mobile.balance")}</span>
            <span className="font-semibold tabular-nums">
              {"$"}
              {formatNumber(virtualBalanceUsd)}
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Profit:</span>
            <span
              className={`font-semibold tabular-nums ${
                cumulativeProfitRatePct > 0
                  ? "text-profit"
                  : cumulativeProfitRatePct < 0
                  ? "text-loss"
                  : "text-muted-foreground"
              }`}
            >
              {cumulativeProfitRatePct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Bottom Row: Action Buttons */}
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            variant="outline"
            className="rounded-md h-8 text-xs !bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-600"
            asChild
          >
            <Link href={`/trading-room/${room.id}/stream`}>
              <span className="inline-flex items-center">
                <VideoIcon className="size-3 mr-1" />
                {t("stream.button")}
              </span>
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="rounded-md h-8 text-xs"
                >
                  <DoorClosedIcon className="size-3 mr-1" />
                  {t("actions.close")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("closeDialog.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("closeDialog.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-md">
                    {t("common.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await supabase
                        .from("trading_rooms")
                        .update({ room_status: "ended" })
                        .eq("id", room.id);
                      router.push("/trading");
                      if (onCloseRoom) onCloseRoom();
                    }}
                    className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-md"
                  >
                    {t("actions.closeRoom")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="destructive"
              className="rounded-md h-8 text-xs"
              onClick={async () => {
                try {
                  // Remove user from room participants
                  const { error } = await supabase
                    .from("trading_room_participants")
                    .update({ left_at: new Date().toISOString() })
                    .eq("room_id", room.id)
                    .eq("user_id", room.creator_id)
                    .is("left_at", null);

                  if (error) {
                    console.error("Error leaving room:", error);
                    toast.error(t("toasts.leaveFailed"));
                    return;
                  }

                  // Redirect to trading page
                  router.push("/trading");
                  if (onCloseRoom) onCloseRoom();
                } catch (error) {
                  console.error("Error leaving room:", error);
                  toast.error(t("toasts.leaveFailed"));
                }
              }}
            >
              <LogOutIcon className="size-3 mr-1" />
              {t("actions.leave")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
