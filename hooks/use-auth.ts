"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

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
}

// Query key for user data
const USER_QUERY_KEY = ["user"];

// Function to fetch user data
async function fetchUserData(userId: string): Promise<UserData> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins, role, mobile_number, identity_verified"
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

  // Set up auth state change listener
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

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [queryClient]);

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
