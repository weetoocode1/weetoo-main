"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useBanStore } from "@/lib/store/ban-store";
interface MinimalAuthUserIdentity {
  provider?: string;
}
interface MinimalAuthUserAppMeta {
  provider?: string;
}
interface MinimalAuthUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: MinimalAuthUserAppMeta | null;
  identities?: MinimalAuthUserIdentity[] | null;
}

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
  mobile_number?: string;
  identity_verified?: boolean;
  identity_verified_at?: string;
  identity_verification_id?: string;
  banned?: boolean;
  ban_reason?: string;
  banned_at?: string;
}

// Query key for user data
const USER_QUERY_KEY = ["user"];

// Function to fetch user data
async function fetchUserData(userId: string): Promise<UserData> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins, role, mobile_number, identity_verified, banned, ban_reason, banned_at"
    )
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Failed to fetch user data:", error);
    // If it's an RLS policy error, we can still show a basic dropdown
    if (error.code === "42P17") {
      console.warn(
        "RLS policy error detected. This might be due to infinite recursion in the policy."
      );
    }
    throw error;
  }

  return data;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const lastSessionId = useRef<string | null>(null);
  const openBan = useBanStore((s) => s.openBan);

  // Get current session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const userId = session?.user?.id;

  // Best-effort profile synchronization: when we have a fresh session, ensure
  // a corresponding row exists in public.users and backfill first/last name
  // from the OAuth provider display name. This runs client-side after sign-in
  // and avoids overwriting existing non-null values.
  useEffect(() => {
    const syncProfile = async () => {
      if (!session?.user?.id) return;

      const supabase = createClient();
      const authUser = session.user as unknown as MinimalAuthUser;

      // Derive names from auth metadata/display name
      const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
      const providerFromAppMeta = authUser.app_metadata?.provider as
        | string
        | undefined;
      const providerFromIdentity = authUser.identities?.[0]?.provider as
        | string
        | undefined;
      const provider: string | undefined =
        providerFromAppMeta || providerFromIdentity;

      const getString = (v: unknown): string | undefined =>
        typeof v === "string" && v.trim().length > 0 ? v : undefined;
      const displayName: string | undefined =
        getString(meta.full_name) ||
        getString(meta.name) ||
        getString(meta.user_name) ||
        getString(meta.nickname) ||
        getString(meta.preferred_username);

      let derivedFirst: string | null = null;
      let derivedLast: string | null = null;
      if (displayName && typeof displayName === "string") {
        const parts = displayName.trim().split(/\s+/);
        if (parts.length === 1) {
          derivedFirst = parts[0];
          derivedLast = "";
        } else if (parts.length > 1) {
          derivedFirst = parts[0];
          derivedLast = parts.slice(1).join(" ");
        }
      }

      const avatarUrl: string | null =
        getString(meta.avatar_url) || getString(meta.picture) || null;

      // Derive nickname from email local part if available
      const email = authUser.email || undefined;
      const derivedNickname: string | null = email
        ? (email.split("@")[0] || "").trim() || null
        : null;

      // 1) fetch current public.users row
      const { data: existing } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, email, avatar_url, provider_type, nickname"
        )
        .eq("id", authUser.id)
        .maybeSingle();

      if (!existing) {
        // Insert new row with best-available fields
        await supabase.from("users").insert({
          id: authUser.id,
          email: authUser.email,
          first_name: derivedFirst,
          last_name: derivedLast,
          avatar_url: avatarUrl,
          provider_type: provider ?? null,
          nickname: derivedNickname,
        });
        return;
      }

      // 2) Update only missing name fields or avatar/provider if absent
      const needsUpdate =
        (!existing.first_name && derivedFirst) ||
        (!existing.last_name && derivedLast) ||
        (!existing.avatar_url && avatarUrl) ||
        (!existing.provider_type && provider) ||
        (!existing.nickname && derivedNickname);

      if (needsUpdate) {
        await supabase
          .from("users")
          .update({
            first_name: existing.first_name || derivedFirst,
            last_name: existing.last_name || derivedLast,
            avatar_url: existing.avatar_url || avatarUrl,
            provider_type: existing.provider_type || provider || null,
            nickname: existing.nickname || derivedNickname,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);
      }
    };

    // Run once when session becomes available
    syncProfile().catch(() => {});
  }, [session?.user?.id]);

  // Fetch user data when userId changes
  const {
    data: user,
    isLoading: userLoading,
    error,
  } = useQuery({
    queryKey: [...USER_QUERY_KEY, userId],
    queryFn: () => fetchUserData(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on RLS policy errors
      if (error?.code === "42P17") return false;
      return failureCount < 3;
    },
    // Keep previous data while refetching to prevent UI flicker
    placeholderData: (previousData) => previousData,
  });

  // Combined loading state - loading if session is loading OR if we have a userId but user data is loading
  const loading = sessionLoading || (!!userId && userLoading);

  // If no session and not loading, user should be null
  const finalUser = !session && !sessionLoading ? null : user;

  // Immediate client-side guard: if a banned user logs in, show modal and end session
  const banHandledRef = useRef(false);
  useEffect(() => {
    if (!finalUser || banHandledRef.current) return;
    const anyUser = finalUser as unknown as {
      banned?: boolean;
      ban_reason?: string;
      banned_at?: string;
    };
    if (anyUser?.banned) {
      banHandledRef.current = true;
      try {
        // Open global ban dialog
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useBanStore } = require("@/lib/store/ban-store");
        useBanStore.getState().openBan({
          reason: anyUser.ban_reason || "",
          bannedAt: anyUser.banned_at || new Date().toISOString(),
        });
      } catch {}
      try {
        createClient().auth.signOut();
      } catch {}
      try {
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          window.location.href = "/";
        }
      } catch {}
    }
  }, [finalUser]);

  // Set up auth state change listener and real-time subscriptions
  useEffect(() => {
    const supabase = createClient();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionId = session?.user?.id || null;

        if (lastSessionId.current === sessionId) {
          return;
        }

        lastSessionId.current = sessionId;

        if (!sessionId) {
          // Clear user data when logged out
          queryClient.setQueryData([...USER_QUERY_KEY, sessionId], null);
          queryClient.setQueryData(USER_QUERY_KEY, null);
          return;
        }

        // Invalidate and refetch user data when auth state changes
        await queryClient.invalidateQueries({
          queryKey: [...USER_QUERY_KEY, sessionId],
        });
      }
    );

    // Set up real-time subscriptions for user and user_bans changes
    let userSubscription: any = null;
    let bansSubscription: any = null;
    if (userId) {
      userSubscription = supabase
        .channel(`user-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "users",
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const newData = payload.new as UserData;

            // Optimistically update the user data in the cache
            queryClient.setQueryData(
              [...USER_QUERY_KEY, userId],
              (oldData: UserData | undefined) => {
                if (oldData) {
                  return {
                    ...oldData,
                    ...newData,
                  };
                }
                return newData;
              }
            );

            // Also update the general user query data
            queryClient.setQueryData(
              USER_QUERY_KEY,
              (oldData: UserData | undefined) => {
                if (oldData && oldData.id === userId) {
                  return {
                    ...oldData,
                    ...newData,
                  };
                }
                return oldData;
              }
            );

            // If user is banned, show modal, sign out, keep on "/"
            if (newData?.banned) {
              try {
                openBan({
                  reason: newData.ban_reason || "",
                  bannedAt: newData.banned_at || new Date().toISOString(),
                });
              } catch {}
              try {
                createClient().auth.signOut();
              } catch {}
              try {
                if (window.location.pathname !== "/") {
                  window.location.href = "/";
                }
              } catch {}
            }

            // Dispatch custom event for KOR coins changes
            const oldData = queryClient.getQueryData([
              ...USER_QUERY_KEY,
              userId,
            ]) as UserData | undefined;
            if (oldData?.kor_coins !== newData.kor_coins) {
              window.dispatchEvent(
                new CustomEvent("kor-coins-updated", {
                  detail: {
                    userId,
                    oldAmount: oldData?.kor_coins || 0,
                    newAmount: newData.kor_coins || 0,
                  },
                })
              );
            }
          }
        )
        .subscribe();

      // Realtime: react to admin bans immediately via user_bans table
      bansSubscription = supabase
        .channel(`user-bans-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_bans",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as {
              active?: boolean;
              reason?: string;
              banned_at?: string;
            };
            if (row?.active) {
              try {
                openBan({
                  reason: (row as any)?.reason || "",
                  bannedAt: (row as any)?.banned_at || new Date().toISOString(),
                });
              } catch {}
              try {
                createClient().auth.signOut();
              } catch {}
              try {
                if (window.location.pathname !== "/") {
                  window.location.href = "/";
                }
              } catch {}
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_bans",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as {
              active?: boolean;
              reason?: string;
              banned_at?: string;
            };
            if (row?.active) {
              try {
                openBan({
                  reason: (row as any)?.reason || "",
                  bannedAt: (row as any)?.banned_at || new Date().toISOString(),
                });
              } catch {}
              try {
                createClient().auth.signOut();
              } catch {}
              try {
                if (window.location.pathname !== "/") {
                  window.location.href = "/";
                }
              } catch {}
            }
          }
        )
        .subscribe();
    }

    // Listen for identity verification completion
    const handleIdentityVerified = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { detail: verificationData } = customEvent;

      if (userId && verificationData) {
        // Optimistically update the user data in the cache
        queryClient.setQueryData(
          [...USER_QUERY_KEY, userId],
          (oldData: UserData | undefined) => {
            if (oldData) {
              return {
                ...oldData,
                identity_verified: true,
                identity_verified_at: new Date().toISOString(),
                identity_verification_id: verificationData.data?.id,
              };
            }
            return oldData;
          }
        );

        // Also update the general user query data
        queryClient.setQueryData(
          USER_QUERY_KEY,
          (oldData: UserData | undefined) => {
            if (oldData && oldData.id === userId) {
              return {
                ...oldData,
                identity_verified: true,
                identity_verified_at: new Date().toISOString(),
                identity_verification_id: verificationData.data?.id,
              };
            }
            return oldData;
          }
        );

        // Invalidate queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({
          queryKey: ["user-verification"],
        });
      }
    };

    // Add event listener for identity verification
    window.addEventListener("identity-verified", handleIdentityVerified);

    return () => {
      listener?.subscription.unsubscribe();
      if (userSubscription) userSubscription.unsubscribe();
      if (bansSubscription) bansSubscription.unsubscribe();
      window.removeEventListener("identity-verified", handleIdentityVerified);
    };
  }, [queryClient, userId]);

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
    const mobile_number = user.mobile_number || "-";
    const identity_verified = user.identity_verified || false;

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
      mobile_number,
      identity_verified,
    };
  }, [user]);

  const isSuperAdmin = useMemo(() => {
    return computed?.role === "super_admin";
  }, [computed?.role]);

  const isAdmin = useMemo(() => {
    return computed?.role === "admin" || computed?.role === "super_admin";
  }, [computed?.role]);

  // Debug logging for admin layout issues
  // if (process.env.NODE_ENV === "development") {
  //   console.log("useAuth debug:", {
  //     userId,
  //     session: !!session,
  //     sessionLoading,
  //     user: user?.id,
  //     userRole: user?.role,
  //     userLoading,
  //     finalUser: finalUser?.id,
  //     loading,
  //     error: error?.message,
  //     isAdmin,
  //     isSuperAdmin,
  //   });
  // }

  return {
    user: finalUser,
    loading,
    computed,
    isSuperAdmin,
    isAdmin,
  };
}
