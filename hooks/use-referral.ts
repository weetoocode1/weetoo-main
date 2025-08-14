import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateReferralCode,
  getReferralCode,
  getReferralDashboardData,
  setCustomReferralCode,
} from "@/app/actions/generateReferralCode";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

// Query keys for better cache management
export const referralKeys = {
  all: ["referral"] as const,
  code: () => [...referralKeys.all, "code"] as const,
  dashboard: () => [...referralKeys.all, "dashboard"] as const,
  user: (userId: string) => [...referralKeys.all, "user", userId] as const,
  check: (code: string) => [...referralKeys.all, "check", code] as const,
};

// Hook for fetching referral code
export function useReferralCode() {
  return useQuery({
    queryKey: referralKeys.code(),
    queryFn: getReferralCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 3;
    },
  });
}

// Hook for fetching referral dashboard data
export function useReferralDashboard() {
  return useQuery({
    queryKey: referralKeys.dashboard(),
    queryFn: getReferralDashboardData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 3;
    },
  });
}

// Hook for generating new referral code
export function useGenerateReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateReferralCode,
    onSuccess: (data) => {
      // Invalidate and refetch referral code
      queryClient.invalidateQueries({ queryKey: referralKeys.code() });
      // Update the cache directly for immediate UI update
      queryClient.setQueryData(referralKeys.code(), data);
    },
    onError: (error) => {
      console.error("Failed to generate referral code:", error);
    },
  });
}

// Hook for setting custom referral code
export function useSetCustomReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setCustomReferralCode,
    onSuccess: (data) => {
      if (!data.error) {
        // Invalidate and refetch referral code
        queryClient.invalidateQueries({ queryKey: referralKeys.code() });
        // Update the cache directly for immediate UI update
        queryClient.setQueryData(referralKeys.code(), { code: data.code });
      }
    },
    onError: (error) => {
      console.error("Failed to set custom referral code:", error);
    },
  });
}

// Hook for checking custom code availability
export function useCheckCodeAvailability(code: string, userId: string | null) {
  return useQuery({
    queryKey: referralKeys.check(code),
    queryFn: async () => {
      if (!code || !userId) return null;

      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("referral_codes")
        .select("user_id")
        .eq("code", code);

      if (error) throw error;

      return {
        isTaken: data && data.length > 0 && data[0].user_id !== userId,
        data,
      };
    },
    enabled: !!code && !!userId && code.length >= 4,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // Don't retry availability checks
  });
}

// Hook for getting current user
export function useCurrentUser() {
  return useQuery({
    queryKey: referralKeys.user("current"),
    queryFn: async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error: any) => {
      // Don't retry auth errors
      if (error?.message?.includes("auth")) return false;
      return failureCount < 2;
    },
  });
}

// Hook for real-time referral updates
export function useReferralRealtimeUpdates(userId: string | null) {
  const queryClient = useQueryClient();

  // This hook doesn't return anything, it just sets up the real-time listener
  // and invalidates queries when updates occur

  if (!userId) return null;

  // Set up real-time listener for referral updates
  const supabase = createSupabaseClient();
  const channel = supabase
    .channel("referrals-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "referrals",
        filter: `referrer_user_id=eq.${userId}`,
      },
      (payload) => {
        // Invalidate dashboard query to refetch latest data
        queryClient.invalidateQueries({ queryKey: referralKeys.dashboard() });
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "referrals",
        filter: `referrer_user_id=eq.${userId}`,
      },
      (payload) => {
        // Invalidate dashboard query to refetch latest data
        queryClient.invalidateQueries({ queryKey: referralKeys.dashboard() });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
