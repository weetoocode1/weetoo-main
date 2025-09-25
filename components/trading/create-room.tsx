import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import bcrypt from "bcryptjs";
import debounce from "lodash.debounce";
import {
  Coins,
  Eye,
  EyeOff,
  PlusIcon,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { IdentityVerificationButton } from "@/components/identity-verification-button";
import { useTranslations as useT } from "next-intl";

interface UserData {
  id: string;
  kor_coins?: number;
}

interface ExistingRoom {
  id: string;
  name: string;
  room_status: string;
  created_at: string;
}

export function CreateRoom() {
  const t = useTranslations("createRoom");
  const tCommon = useTranslations("common");
  const tIV = useT("identityVerification");
  const { user: authUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [privacy, setPrivacy] = useState("public");
  const [category, setCategory] = useState("regular");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingRoom, setExistingRoom] = useState<ExistingRoom | null>(null);
  const [, setCheckingExistingRoom] = useState(false);
  const lastSessionId = useRef<string | null>(null);

  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const supabase = createClient();

  // Debounced room name check
  const checkRoomName = useMemo(
    () =>
      debounce(async (name: string) => {
        if (!name.trim()) {
          setNameError(null);
          setCheckingName(false);
          return;
        }
        setCheckingName(true);
        try {
          const res = await fetch(
            `/api/trading-rooms/check-name?name=${encodeURIComponent(name)}`
          );
          const data = await res.json();
          if (data.exists) {
            setNameError(t("roomNameAlreadyInUse"));
          } else {
            setNameError(null);
          }
        } catch (_e) {
          setNameError(t("couldNotCheckRoomName"));
        } finally {
          setCheckingName(false);
        }
      }, 400),
    []
  );

  useEffect(() => {
    checkRoomName(roomName);
    return () => {
      checkRoomName.cancel();
    };
  }, [roomName, checkRoomName]);

  // Enhanced existing room check with localStorage persistence
  const checkExistingRoom = async (userId: string) => {
    setCheckingExistingRoom(true);
    try {
      const { data: activeRooms, error } = await supabase
        .from("trading_rooms")
        .select("id, name, room_status, created_at")
        .eq("creator_id", userId)
        .eq("room_status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error checking existing room:", error);
        toast.error(t("toasts.failedCheckExistingRooms"));
        setExistingRoom(null);
        // Clear localStorage on error
        localStorage.removeItem(`existing_room_${userId}`);
        return;
      }

      if (activeRooms && activeRooms.length > 0) {
        const room = activeRooms[0];
        setExistingRoom(room);
        // Store in localStorage for cross-tab persistence
        localStorage.setItem(`existing_room_${userId}`, JSON.stringify(room));
        return room;
      } else {
        setExistingRoom(null);
        // Clear localStorage when no active room
        localStorage.removeItem(`existing_room_${userId}`);
        return null;
      }
    } catch (error) {
      console.error("Error checking existing room:", error);
      setExistingRoom(null);
      localStorage.removeItem(`existing_room_${userId}`);
      return null;
    } finally {
      setCheckingExistingRoom(false);
    }
  };

  // Load existing room from localStorage on mount
  // const loadExistingRoomFromStorage = (userId: string) => {
  //   try {
  //     const stored = localStorage.getItem(`existing_room_${userId}`);
  //     if (stored) {
  //       const room = JSON.parse(stored);
  //       setExistingRoom(room);
  //       return room;
  //     }
  //   } catch (error) {
  //     console.error("Error loading existing room from storage:", error);
  //     localStorage.removeItem(`existing_room_${userId}`);
  //   }
  //   return null;
  // };

  // Function to close existing room
  // const closeExistingRoom = async (roomId: string) => {
  //   try {
  //     const { error } = await supabase
  //       .from("trading_rooms")
  //       .update({ room_status: "ended" })
  //       .eq("id", roomId);

  //     if (error) {
  //       console.error("Error closing room:", error);
  //       toast.error("Failed to close existing room. Please try again.");
  //       return;
  //     }

  //     // Clear localStorage and refresh the check
  //     if (user) {
  //       localStorage.removeItem(`existing_room_${user.id}`);
  //     }
  //     await checkExistingRoom(user!.id);
  //     toast.success("Room closed successfully! You can now create a new room.");
  //   } catch (error) {
  //     console.error("Error closing room:", error);
  //     toast.error("Failed to close existing room. Please try again.");
  //   }
  // };

  // Real-time subscription to track room status changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`room-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_rooms",
          filter: `creator_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("Room status change detected:", payload);

          // Refresh the existing room check
          await checkExistingRoom(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Listen for identity verification completion
  useEffect(() => {
    const handleIdentityVerified = (event: Event) => {
      // Force a re-render to update verification status
      // This will update the authUser.identity_verified status instantly
      // The useAuth hook will have updated the user data, so we just need to trigger a re-render
      setOpen((prev) => prev); // Triggers re-render with updated verification status
    };

    window.addEventListener("identity-verified", handleIdentityVerified);
    return () =>
      window.removeEventListener("identity-verified", handleIdentityVerified);
  }, []);

  // Listen for storage events (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (user?.id && e.key === `existing_room_${user.id}`) {
        if (e.newValue) {
          try {
            const room = JSON.parse(e.newValue);
            setExistingRoom(room);
          } catch (error) {
            console.error("Error parsing stored room:", error);
            setExistingRoom(null);
          }
        } else {
          setExistingRoom(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const sessionId = data.user?.id || null;

      if (lastSessionId.current === sessionId && user) {
        setLoading(false);
        return;
      }
      lastSessionId.current = sessionId;
      if (!sessionId) {
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);

      supabase
        .from("users")
        .select("id, kor_coins")
        .eq("id", sessionId)
        .single()
        .then(({ data, error }) => {
          if (mounted) {
            if (error) {
              console.error("Failed to fetch user data:", error);
            }
            setUser(error ? null : data);
            setLoading(false);

            // Load existing room from storage and verify with server
            if (data) {
              // const storedRoom = loadExistingRoomFromStorage(data.id);
              // Always verify with server to ensure accuracy
              checkExistingRoom(data.id);
            }
          }
        });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionId = session?.user?.id || null;
        if (lastSessionId.current === sessionId && user) {
          setLoading(false);
          return;
        }
        lastSessionId.current = sessionId;
        if (!sessionId) {
          setUser(null);
          setExistingRoom(null);
          setLoading(false);
          return;
        }
        setLoading(true);
        supabase
          .from("users")
          .select("id, kor_coins")
          .eq("id", sessionId)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to fetch user data on auth change:", error);
            }
            setUser(error ? null : data);
            setLoading(false);

            // Load existing room from storage and verify with server
            if (data) {
              // const storedRoom = loadExistingRoomFromStorage(data.id);
              // Always verify with server to ensure accuracy
              checkExistingRoom(data.id);
            }
          });
      }
    );

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const userKorCoins = useMemo(() => {
    return user?.kor_coins ?? 0;
  }, [user?.kor_coins]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getRoomCost = (category: string) => {
    switch (category) {
      case "voice":
        return 8000;
      case "regular":
      default:
        return 5000;
    }
  };

  const roomCost = getRoomCost(category);
  const canAfford = userKorCoins >= roomCost;

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !roomName.trim() || nameError) return;

    // Check if user has enough KOR coins
    if (!canAfford) {
      toast.error(
        t("toasts.insufficientKorCoins", {
          needed: roomCost.toLocaleString(),
          category,
          current: userKorCoins.toLocaleString(),
        })
      );
      return;
    }

    // Double-check if user already has an active room
    const { data: activeRooms, error: checkError } = await supabase
      .from("trading_rooms")
      .select("id, name, room_status")
      .eq("creator_id", user.id)
      .eq("room_status", "active");

    if (checkError) {
      console.error("Error checking active rooms:", checkError);
      toast.error(t("toasts.errorCheckingRooms"));
      return;
    }

    if (activeRooms && activeRooms.length > 0) {
      const existingRoom = activeRooms[0];
      toast.error(t("toasts.alreadyHaveActive", { name: existingRoom.name }));
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "default_virtual_balance")
      .single();
    const defaultVirtualBalance = settings?.value ?? 100000;
    let hashedPassword = null;
    if (privacy === "private" && roomPassword) {
      hashedPassword = await bcrypt.hash(roomPassword, 10);
    }
    const { data, error } = await supabase
      .from("trading_rooms")
      .insert([
        {
          name: roomName.trim(),
          creator_id: user.id,
          symbol,
          category,
          privacy,
          password: privacy === "private" ? hashedPassword : null,
          // participants_count: 1,
          max_participants: 100,
          room_status: "active",
          is_active: true,
          virtual_balance: defaultVirtualBalance,
        },
      ])
      .select()
      .single();
    if (error || !data) {
      setSubmitting(false);
      toast.error(t("failedToCreateRoom"));
      return;
    }
    // Add creator as participant
    await supabase.from("trading_room_participants").insert([
      {
        room_id: data.id,
        user_id: user.id,
      },
    ]);

    // Deduct KOR coins for room creation (server update + optimistic client update)
    try {
      const oldAmount = user.kor_coins ?? 0;
      const newAmount = Math.max(0, oldAmount - roomCost);
      await supabase
        .from("users")
        .update({ kor_coins: newAmount })
        .eq("id", user.id);
      setUser((prev) => (prev ? { ...prev, kor_coins: newAmount } : prev));
      try {
        window.dispatchEvent(
          new CustomEvent("kor-coins-updated", {
            detail: { userId: user.id, oldAmount, newAmount },
          })
        );
      } catch {}
    } catch (err) {
      console.error("Failed to deduct KOR coins after creating room", err);
    }
    setSubmitting(false);
    setOpen(false);
    toast.success(t("toasts.created"));
    window.open(`/room/${data.id}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="ml-auto cursor-pointer"
                onClick={async () => {
                  // Check identity verification first
                  if (!authUser?.identity_verified) {
                    toast.error(t("verify.requiredForRooms"));
                    return;
                  }

                  if (user) {
                    // Always check with server first
                    const currentRoom = await checkExistingRoom(user.id);
                    if (currentRoom) {
                      toast.error(
                        t("toasts.alreadyHaveActive", {
                          name: currentRoom.name,
                        })
                      );
                      return;
                    }
                  }
                  setOpen(true);
                }}
              >
                <PlusIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                {t("createRoom")}
              </Button>
            </TooltipTrigger>
            {existingRoom && (
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-sm">
                  <p className="font-medium mb-1">{t("alreadyActiveTitle")}</p>
                  <p className="text-muted-foreground">
                    {t("roomLabel")}{" "}
                    <span className="font-medium">
                      &quot;{existingRoom.name}&quot;
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {t("alreadyActiveInstruction")}
                  </p>
                </div>
              </TooltipContent>
            )}
            {!authUser?.identity_verified && (
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-sm">
                  <p className="font-medium mb-1 text-amber-600">
                    🔒 {tCommon("identityVerificationRequired")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("verify.tooltipBody")}
                  </p>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background border border-border rounded-lg p-0 shadow-none">
        {/* Show verification screen if user is not verified */}
        {!authUser?.identity_verified ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-950/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground mb-2">
                {tCommon("identityVerificationRequired")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mb-6">
                {t("verify.dialogBody")}
              </DialogDescription>
              <IdentityVerificationButton
                isFormValid={true}
                mobileNumber={authUser?.mobile_number || ""}
                text={tIV("button.verificationNeeded")}
                onVerificationSuccess={(verificationData, userData) => {
                  toast.success(tIV("toast.success"));
                  // Close the dialog and refresh the page to update verification status
                  setOpen(false);
                  window.location.reload();
                }}
                onVerificationFailure={() => {
                  toast.error(tIV("errors.generic"));
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-2 gap-1">
              <DialogTitle className="font-semibold flex items-center gap-2 text-lg text-foreground">
                {t("createTradingRoom")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t("setUpTradingRoomDetails")}
              </DialogDescription>
            </DialogHeader>

            <div className="border-b border-border mx-6" />
            <form
              className="px-6 py-6 flex flex-col gap-5"
              onSubmit={handleCreateRoom}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="room-name"
                    className="font-medium text-sm text-foreground mb-1"
                  >
                    {t("roomName")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="room-name"
                    placeholder={t("enterRoomName")}
                    required
                    className="text-sm h-10"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    aria-invalid={!!nameError}
                  />
                  {checkingName && (
                    <span className="text-xs text-muted-foreground">
                      {t("checkingName")}
                    </span>
                  )}
                  {nameError && (
                    <span className="text-xs text-red-600">{nameError}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="privacy"
                    className="font-medium text-sm text-foreground mb-1"
                  >
                    {t("privacy")}
                  </Label>
                  <Select value={privacy} onValueChange={setPrivacy}>
                    <SelectTrigger id="privacy" className="w-full text-sm h-10">
                      <SelectValue placeholder={t("selectPrivacy")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{t("public")}</SelectItem>
                      <SelectItem value="private">{t("private")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {privacy === "private" && (
                  <div className="flex flex-col gap-1 md:col-span-2 animate-fade-in relative">
                    <Label
                      htmlFor="room-password"
                      className="font-medium text-sm text-foreground mb-1"
                    >
                      {t("password")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="room-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("enterRoomPassword")}
                      required
                      className="text-sm pr-10 h-10"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-10 text-muted-foreground hover:text-foreground focus:outline-none"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? t("hidePassword") : t("showPassword")
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="symbol"
                  className="font-medium text-sm text-foreground mb-1"
                >
                  {t("symbol")}
                </Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger id="symbol" className="w-full text-sm h-10">
                    <SelectValue placeholder={t("selectSymbol")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {TRADING_SYMBOLS.map((symbol) => (
                      <SelectItem
                        key={symbol.value}
                        value={symbol.value}
                        className="flex items-center gap-2"
                      >
                        <span>{symbol.label}</span>
                        {symbol.isNew && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            {t("badges.new")}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="category"
                  className="font-medium text-sm text-foreground mb-1"
                >
                  {t("roomCategory")}
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="w-full text-sm h-10">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">{t("regularRoom")}</SelectItem>
                    {/** Temporarily disabled voice room option */}
                    {/** <SelectItem value="voice">{t("voiceRoom")}</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>

              {/* User Balance Display */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/30 dark:to-slate-900/30 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <Wallet className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {t("availableBalance")}
                      </p>
                      {loading ? (
                        <Skeleton className="h-6 w-20" />
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-lg font-bold text-foreground cursor-help">
                                {formatNumber(userKorCoins)} KOR
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="center">
                              <p>{userKorCoins.toLocaleString()} KOR</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {t("roomCost")}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        canAfford
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {roomCost.toLocaleString()} KOR
                    </p>
                  </div>
                </div>

                {/* Room Features */}
                <div className="flex items-start gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                    <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground mb-1">
                      {t("roomFeatures")}:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category === "voice"
                        ? t("voiceRoomDescription")
                        : t("regularRoomDescription")}
                    </p>
                    {!loading && !canAfford && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                        ⚠️ {t("insufficientBalance")} {t("youNeed")}{" "}
                        {(roomCost - userKorCoins).toLocaleString()}{" "}
                        {t("moreKorCoins")}.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    submitting ||
                    !!nameError ||
                    checkingName ||
                    !canAfford
                  }
                >
                  {submitting
                    ? t("creating")
                    : loading
                    ? t("loading")
                    : !canAfford
                    ? t("button.insufficientKor")
                    : t("createRoom")}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
