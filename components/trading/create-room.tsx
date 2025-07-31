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
import { Coins, Eye, EyeOff, PlusIcon, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";

interface UserData {
  id: string;
  kor_coins?: number;
}

export function CreateRoom() {
  const t = useTranslations("createRoom");
  const [open, setOpen] = useState(false);
  const [privacy, setPrivacy] = useState("public");
  const [category, setCategory] = useState("regular");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      const sessionId = data.session?.user?.id || null;

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
      alert(t("failedToCreateRoom"));
      return;
    }
    // Add creator as participant
    await supabase.from("trading_room_participants").insert([
      {
        room_id: data.id,
        user_id: user.id,
      },
    ]);
    setSubmitting(false);
    setOpen(false);
    window.open(`/room/${data.id}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto cursor-pointer">
          <PlusIcon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
          {t("createRoom")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background border border-border rounded-lg p-0 shadow-none">
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
                        NEW
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
                <SelectItem value="voice">{t("voiceRoom")}</SelectItem>
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
                <p className="text-xs text-muted-foreground">{t("roomCost")}</p>
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
              disabled={loading || submitting || !!nameError || checkingName}
            >
              {submitting
                ? t("creating")
                : loading
                ? t("loading")
                : t("createRoom")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
