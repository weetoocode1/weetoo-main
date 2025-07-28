"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  Coins,
  Eye,
  EyeOff,
  LogOutIcon,
  ShieldIcon,
  Star,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface UserData {
  id: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  email?: string;
  avatar_url?: string;
  level?: number;
  exp?: number;
  kor_coins?: number;
  role?: string;
}

export function UserDropdown() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const lastSessionId = useRef<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

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
        .select(
          "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins, role"
        )
        .eq("id", sessionId)
        .single()
        .then(({ data, error }) => {
          if (mounted) {
            if (error) {
              console.error("Failed to fetch user data:", error);
              // If it's an RLS policy error, we can still show a basic dropdown
              if (error.code === "42P17") {
                console.warn(
                  "RLS policy error detected. This might be due to infinite recursion in the policy."
                );
              }
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
          .select(
            "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins, role"
          )
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

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);
    if (error) {
      toast.error("Failed to log out. Please try again.");
    } else {
      toast.success("Logged out successfully.");
      router.refresh();
      router.push("/");
    }
  }, [router]);

  const computed = useMemo(() => {
    if (!user) return null;
    const fullName =
      user.first_name || user.last_name
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
        : user.nickname || user.email || "User";
    const avatarUrl =
      user.avatar_url || "https://vercel.com/api/www/avatar?s=64&u=weetoo";
    const nickname = user.nickname || user.email || "-";
    const email = user.email || "-";
    const EXP_PER_LEVEL = 10000;
    const exp = user.exp ?? 0;
    const level = Math.floor(exp / EXP_PER_LEVEL);
    const expThisLevel = exp - level * EXP_PER_LEVEL;
    const progress = Math.max(
      0,
      Math.min(100, (expThisLevel / EXP_PER_LEVEL) * 100)
    );
    const kor_coins = user.kor_coins ?? 0;
    const role = user.role || "user";
    return {
      fullName,
      avatarUrl,
      nickname,
      email,
      level,
      exp,
      kor_coins,
      role,
      progress,
      expThisLevel,
      EXP_PER_LEVEL,
    };
  }, [user]);

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
    role,
    progress,
    expThisLevel,
    EXP_PER_LEVEL,
  } = computed;

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="relative h-9 w-9 rounded-full p-0 overflow-hidden flex items-center justify-center bg-transparent border-none focus:outline-none cursor-pointer"
            aria-label="Open user menu"
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
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-72 p-0 bg-card/95 backdrop-blur-sm border shadow-lg rounded-xl overflow-hidden"
          align="end"
          sideOffset={8}
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
                        aria-label={showEmail ? "Hide email" : "Show email"}
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
                    `Level ${level}`
                  )}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : (
                    `Level ${level + 1}`
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
                    `${progress.toFixed(0)}% Complete`
                  )}
                </span>
                <span className="text-red-500 font-semibold">
                  {loading ? (
                    <Skeleton className="h-3 w-20" />
                  ) : (
                    `${expThisLevel.toLocaleString()} / ${EXP_PER_LEVEL.toLocaleString()} EXP`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : (
                    `${exp.toLocaleString()} XP`
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
              <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                <UserIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                Profile
              </DropdownMenuItem>
            </Link>
            {/* <Link href="/inbox">
              <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                <InboxIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                Inbox
              </DropdownMenuItem>
            </Link>
            <Link href="/uid-registration">
              <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                <KeyRoundIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                UID Registration
              </DropdownMenuItem>
            </Link> */}
            {/* Admin Dashboard: Only for admin or super_admin */}
            {["admin", "super_admin"].includes(role) && (
              <Link href="/admin-verification">
                <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                  <ShieldIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                  Go to Admin Dashboard
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuSeparator className="my-2" />
            {/* Weetoo Market */}
            {/* <WeetooMarketDialog /> */}
            {/* KOR Coins Recharge*/}
            {/* <KorCoinsRechargeDialog /> */}
            {/* Customer Support */}
            {/* <CustomerSupportDialog /> */}
            {/* <DropdownMenuSeparator className="my-2" /> */}
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              className="cursor-pointer rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOutIcon className="w-4 h-4 mr-3 text-red-500" />
              {loggingOut ? "Logging out..." : "Log Out"}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
