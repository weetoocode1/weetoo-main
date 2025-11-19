"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  BadgeCheckIcon,
  BanknoteIcon,
  Coins,
  CreditCardIcon,
  Eye,
  EyeOff,
  HistoryIcon,
  KeyRoundIcon,
  LogOutIcon,
  ShieldIcon,
  Star,
  UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function UserDropdown() {
  const t = useTranslations("userDropdown");
  const { user, loading, computed, isAdmin } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [, setKorCoinsUpdateTrigger] = useState(0);

  // Listen for identity verification completion and KOR coins updates
  useEffect(() => {
    const handleIdentityVerified = (event: Event) => {
      setShowEmail((prev) => prev); // Triggers re-render with updated verification status
    };

    const handleKorCoinsUpdated = (event: Event) => {
      // Update the local state with the new amount
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.newAmount !== undefined) {
        // Force a re-render to update KOR coins display
        setKorCoinsUpdateTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener("identity-verified", handleIdentityVerified);
    window.addEventListener("kor-coins-updated", handleKorCoinsUpdated);

    return () => {
      window.removeEventListener("identity-verified", handleIdentityVerified);
      window.removeEventListener("kor-coins-updated", handleKorCoinsUpdated);
    };
  }, []);

  // Real-time subscription to user's updates (kor_coins, exp, level) and rewards inserts
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    // Award daily login once per UTC day on first mount/navigation
    (async () => {
      try {
        const lastAwardedKey = `daily_login_awarded_${user.id}`;
        const lastDay = sessionStorage.getItem(lastAwardedKey);
        const todayUtc = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
        if (lastDay !== todayUtc) {
          const { error } = await supabase.rpc("award_daily_login", {
            p_user_id: user.id,
          });
          if (!error) {
            sessionStorage.setItem(lastAwardedKey, todayUtc);
          }
        }
      } catch (_) {
        // ignore
      }
    })();

    // Subscribe to real-time updates for this user's balances
    const channel = supabase
      .channel(`user-stats-and-rewards-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as {
            kor_coins?: number;
            exp?: number;
            level?: number;
          };
          console.log("UserDropdown: user updated via real-time:", newData);
          // Force a re-render to update displayed stats
          setKorCoinsUpdateTrigger((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rewards",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newReward = payload.new as {
            exp_delta?: number;
            kor_delta?: number;
            title?: string;
            type?: string;
          };
          const expDelta = newReward?.exp_delta ?? 0;
          const korDelta = newReward?.kor_delta ?? 0;
          if (expDelta > 0 || korDelta > 0) {
            const parts: string[] = [];
            if (expDelta > 0) parts.push(`+${expDelta} XP`);
            if (korDelta > 0) parts.push(`+${korDelta} KOR`);
            // Translate the label based on the reward type
            const rewardTypeTranslations = {
              post_shared: "rewards.postShared",
              post_created: "rewards.postCreated",
              post_commented: "rewards.postCommented",
              post_liked: "rewards.postLiked",
              daily_login: "rewards.dailyLogin",
              room_created: "rewards.roomCreated",
            } as const;

            const getTranslatedLabel = (rewardType: string, title?: string) => {
              const translationKey =
                rewardTypeTranslations[
                  rewardType as keyof typeof rewardTypeTranslations
                ];
              return translationKey
                ? t(translationKey)
                : title || t("rewards.defaultLabel");
            };

            const label = getTranslatedLabel(
              newReward?.type || "",
              newReward?.title
            );
            toast.success(`${label}: ${parts.join(", ")}`);
          }
          // Trigger UI refresh
          setKorCoinsUpdateTrigger((prev) => prev + 1);
        }
      );

    channel.subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error("Error removing channel:", error);
      }
    };
  }, [user?.id]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);
    if (error) {
      toast.error(t("toasts.logoutFailed"));
    } else {
      toast.success(t("toasts.logoutSuccess"));
      router.refresh();
      router.push("/");
    }
  }, [router, t]);

  // Helper to mask email
  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    if (name.length <= 2) return "*".repeat(name.length) + "@" + domain;
    return (
      name.slice(0, 3) + "*".repeat(Math.max(1, name.length - 3)) + "@" + domain
    );
  };

  if (loading) {
    return (
      <div className="flex justify-end">
        <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    );
  }
  if (!user || !computed) {
    return null;
  }
  const {
    fullName,
    avatarUrl,
    nickname,
    email,
    level,
    exp,
    kor_coins,
    progress,
    expThisLevel,
    EXP_PER_LEVEL,
  } = computed;

  return (
    <div className="flex justify-end">
      <HoverCard openDelay={0} closeDelay={120}>
        <HoverCardTrigger asChild>
          <div className="relative">
            <button
              type="button"
              className="relative h-9 w-9 rounded-full p-0 overflow-hidden flex items-center justify-center bg-transparent border-none focus:outline-none cursor-pointer"
              aria-label={t("aria.openMenu")}
            >
              <Avatar className="w-8 h-8 border border-border">
                {loading ? (
                  <Skeleton className="w-full h-full rounded-full" />
                ) : user.avatar_url ? (
                  <AvatarImage src={avatarUrl} alt={fullName} />
                ) : null}
                {!loading && !user.avatar_url && (
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                    {nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </button>
            {/* Warning icon overlay for unverified users - positioned outside button */}
            {!loading && !user.identity_verified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 z-10">
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("badges.unverified")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          className="w-72 p-0 bg-card/95 backdrop-blur-sm border shadow-lg rounded-xl overflow-hidden"
          align="end"
          side="bottom"
          sideOffset={4}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                {loading ? (
                  <Skeleton className="w-full h-full rounded-full" />
                ) : user.avatar_url ? (
                  <AvatarImage src={avatarUrl} alt={fullName} />
                ) : null}
                {!loading && !user.avatar_url && (
                  <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                    {nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-1">
                  {loading ? <Skeleton className="h-4 w-24" /> : fullName}
                  {/* Verification Badge */}
                  {!loading && (
                    <>
                      {user.identity_verified ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <BadgeCheckIcon className="w-4 h-4 text-blue-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("badges.verifiedTooltip")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {loading ? (
                    <Skeleton className="h-3 w-28" />
                  ) : (
                    <>
                      {showEmail ? email : maskEmail(email)}
                      <button
                        type="button"
                        className="ml-1 p-0.5 rounded hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setShowEmail((v) => !v)}
                        aria-label={
                          showEmail ? t("aria.hideEmail") : t("aria.showEmail")
                        }
                        tabIndex={0}
                      >
                        {showEmail ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Level Card Section */}
            <div className="my-3 p-3 rounded-xl bg-muted/60 shadow-sm border border-border flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : (
                    `${t("level")} ${level}`
                  )}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : (
                    `${t("level")} ${level + 1}`
                  )}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative mb-1">
                {loading ? (
                  <Skeleton className="h-2 w-full rounded-full" />
                ) : (
                  <div
                    className="absolute left-0 top-0 h-2 bg-red-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-3 w-12" />
                  ) : (
                    `${progress.toFixed(0)}% ${t("complete")}`
                  )}
                </span>
                <span className="text-red-500 font-semibold">
                  {loading ? (
                    <Skeleton className="h-3 w-20" />
                  ) : (
                    `${expThisLevel.toLocaleString()} / ${EXP_PER_LEVEL.toLocaleString()} ${t(
                      "exp"
                    )}`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : (
                    `${exp.toLocaleString()} ${t("xp")}`
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : (
                    `${kor_coins.toLocaleString()} KOR`
                  )}
                </span>
              </div>
            </div>
          </div>
          {/* Menu Items */}
          <div className="p-2">
            <Link href="/profile">
              <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors flex items-center text-sm">
                <UserIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                {t("profile")}
              </div>
            </Link>

            <Link href="/profile?tab=uid-registration">
              <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors flex items-center text-sm">
                <KeyRoundIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                {t("uidRegistration")}
              </div>
            </Link>

            <Link href="/profile?tab=kor-coins-withdrawal">
              <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors flex items-center text-sm">
                <CreditCardIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                {t("korCoinsWithdrawal")}
              </div>
            </Link>

            <Link href="/profile?tab=all-transactions">
              <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors flex items-center text-sm">
                <HistoryIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                {t("allTransactions")}
              </div>
            </Link>

            <Link href="/profile?tab=all-accounts">
              <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors flex items-center text-sm">
                <BanknoteIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                {t("allAccounts")}
              </div>
            </Link>

            {/* <Link href="/inbox">
              <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                <InboxIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                Inbox
              </div>
            </Link>
            <Link href="/uid-registration">
              <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                <KeyRoundIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                UID Registration
              </div>
            </Link> */}
            {/* Admin Dashboard: Only for admin or super_admin */}
            {isAdmin && (
              <>
                <Link href="/admin-verification" target="_blank">
                  <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors flex items-center text-sm">
                    <ShieldIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                    {t("goToAdminDashboard")}
                  </div>
                </Link>

                {/* <Link href="/guidebook">
                  <div className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                    <BookIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                    {t("guidebook")}
                  </div>
                </Link> */}
              </>
            )}
            <div className="my-2 h-px bg-border" />
            {/* Weetoo Market */}
            {/* <WeetooMarketDialog /> */}
            {/* KOR Coins Recharge*/}
            {/* <KorCoinsRechargeDialog /> */}
            {/* Customer Support */}
            {/* <CustomerSupportDialog /> */}
            {/* <DropdownMenuSeparator className="my-2" /> */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full text-left cursor-pointer rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center text-sm"
            >
              <LogOutIcon className="w-4 h-4 mr-3 text-red-500" />
              {loggingOut ? t("loggingOut") : t("logOut")}
            </button>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
