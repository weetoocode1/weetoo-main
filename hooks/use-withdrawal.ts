"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useEffect } from "react";
import type {
  BankAccount,
  WithdrawalRequest,
  CreateWithdrawalRequestData,
  CreateBankAccountData,
  VerifyBankAccountData,
  UpdateWithdrawalStatusData,
  WithdrawalStats,
} from "@/types/withdrawal";

// Query keys
const WITHDRAWAL_KEYS = {
  all: ["withdrawal"] as const,
  requests: () => [...WITHDRAWAL_KEYS.all, "requests"] as const,
  userRequests: (userId: string) =>
    [...WITHDRAWAL_KEYS.requests(), "user", userId] as const,
  allRequests: () => [...WITHDRAWAL_KEYS.requests(), "all"] as const,
  request: (id: string) => [...WITHDRAWAL_KEYS.requests(), id] as const,
  bankAccounts: () => [...WITHDRAWAL_KEYS.all, "bank-accounts"] as const,
  userBankAccounts: (userId: string) =>
    [...WITHDRAWAL_KEYS.bankAccounts(), "user", userId] as const,
  bankAccount: (id: string) => [...WITHDRAWAL_KEYS.bankAccounts(), id] as const,
  stats: () => [...WITHDRAWAL_KEYS.all, "stats"] as const,
};

// API Functions
const withdrawalApi = {
  // Fetch user's withdrawal requests
  async getUserWithdrawalRequests(
    userId: string
  ): Promise<WithdrawalRequest[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        *,
        bank_account:bank_accounts(*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch all withdrawal requests (admin only)
  async getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        *,
        bank_account:bank_accounts(*),
        user:users(id, first_name, last_name, email, level, kor_coins, avatar_url)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch specific withdrawal request
  async getWithdrawalRequest(id: string): Promise<WithdrawalRequest> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        *,
        bank_account:bank_accounts(*),
        user:users(id, first_name, last_name, email, level, kor_coins)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Fetch user's bank accounts
  async getUserBankAccounts(userId: string): Promise<BankAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch specific bank account
  async getBankAccount(id: string): Promise<BankAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create bank account
  async createBankAccount(
    userId: string,
    data: CreateBankAccountData
  ): Promise<BankAccount> {
    const supabase = createClient();
    // Generate a secure random verification amount between 0.0010 and 0.0099 (4 decimals)
    const generateVerificationAmount = () => {
      const min = 10; // 0.0010
      const max = 99; // 0.0099
      const range = max - min + 1;
      const u32 = new Uint32Array(1);
      const maxAcceptable = Math.floor(0xffffffff / range) * range;
      let r: number;
      do {
        crypto.getRandomValues(u32);
        r = u32[0];
      } while (r >= maxAcceptable);
      const n = min + (r % range);
      return Number((n / 10000).toFixed(4));
    };
    const { data: result, error } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: userId,
        ...data,
        is_verified: false,
        verification_amount: generateVerificationAmount(),
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  // Update bank account
  async updateBankAccount(
    id: string,
    data: Partial<CreateBankAccountData>
  ): Promise<BankAccount> {
    const supabase = createClient();
    const { data: result, error } = await supabase
      .from("bank_accounts")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  // Verify bank account
  async verifyBankAccount(
    id: string,
    data: VerifyBankAccountData
  ): Promise<BankAccount> {
    const supabase = createClient();
    // Use a definer RPC that validates the amount, sets is_verified=true,
    // and promotes linked withdrawal requests to verified under RLS.
    const { error: rpcError } = await supabase.rpc("verify_bank_and_promote", {
      _bank_account_id: id,
      _amount: data.verification_amount,
    });
    if (rpcError) throw rpcError;

    // Return the fresh bank account row
    const { data: result, error: fetchError } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    return result as unknown as BankAccount;
  },

  // Create withdrawal request
  async createWithdrawalRequest(
    userId: string,
    data: CreateWithdrawalRequestData
  ): Promise<WithdrawalRequest> {
    const supabase = createClient();

    // First get user level and calculate fees
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("level, kor_coins")
      .eq("id", userId)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error("User not found");

    // Check if user has enough KOR coins
    if (userData.kor_coins < data.kor_coins_amount) {
      throw new Error("Insufficient KOR coins");
    }

    // Calculate fee based on level
    const level = userData.level || 1;
    let feePercentage = 40; // Default for level 1-25 (Bronze)

    if (level >= 76 && level <= 99) {
      feePercentage = 10; // Platinum
    } else if (level >= 51 && level <= 75) {
      feePercentage = 20; // Gold
    } else if (level >= 26 && level <= 50) {
      feePercentage = 30; // Silver
    }

    const feeAmount = Math.floor((data.kor_coins_amount * feePercentage) / 100);
    const finalAmount = data.kor_coins_amount - feeAmount;

    // Ensure bank account exists and has a verification amount
    const { data: bankRow, error: bankFetchError } = await supabase
      .from("bank_accounts")
      .select("id, verification_amount, is_verified")
      .eq("id", data.bank_account_id)
      .single();
    if (bankFetchError || !bankRow) {
      throw new Error("Bank account not found or not accessible");
    }
    if (bankRow && !bankRow.verification_amount) {
      const ensureGenerate = () => {
        const min = 10;
        const max = 99;
        const range = max - min + 1;
        const u32 = new Uint32Array(1);
        const maxAcceptable = Math.floor(0xffffffff / range) * range;
        let r: number;
        do {
          crypto.getRandomValues(u32);
          r = u32[0];
        } while (r >= maxAcceptable);
        const n = min + (r % range);
        return Number((n / 10000).toFixed(4));
      };
      const { error: ensureError } = await supabase
        .from("bank_accounts")
        .update({ verification_amount: ensureGenerate() })
        .eq("id", data.bank_account_id);
      if (ensureError) throw ensureError;
    }

    // Create withdrawal request
    const { data: result, error } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id: userId,
        bank_account_id: data.bank_account_id,
        kor_coins_amount: data.kor_coins_amount,
        fee_percentage: feePercentage,
        fee_amount: feeAmount,
        final_amount: finalAmount,
        // If bank account already verified, mark verified; else pending
        status: bankRow.is_verified ? "verified" : "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Non-blocking: insert admin notification for realtime toast
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("first_name, last_name, nickname, email")
        .eq("id", userId)
        .single();
      const displayName =
        userRow?.first_name || userRow?.last_name
          ? `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim()
          : userRow?.nickname || userRow?.email || "User";
      await supabase.from("notifications").insert({
        user_id: userId,
        audience: "admin",
        type: "withdrawal_request_created",
        title: "New withdrawal request",
        body: `${displayName} requested ${data.kor_coins_amount.toLocaleString()} KOR`,
        metadata: {
          user_id: userId,
          user_name: displayName,
          kor_coins_amount: data.kor_coins_amount,
          withdrawal_request_id: result.id,
        },
        read: false,
      });
    } catch (e) {
      console.warn("Failed to insert admin notification", e);
    }
    // Reserve user's KOR coins by reducing balance immediately
    const newBalance = (userData.kor_coins || 0) - data.kor_coins_amount;
    const { error: balanceError } = await supabase
      .from("users")
      .update({ kor_coins: newBalance })
      .eq("id", userId);

    if (balanceError) {
      console.error("Balance update failed:", balanceError);
    }

    return result;
  },

  // Update withdrawal request status
  async updateWithdrawalStatus(
    id: string,
    data: UpdateWithdrawalStatusData
  ): Promise<WithdrawalRequest> {
    const supabase = createClient();
    // Fetch existing row to determine previous status and amount
    const { data: existing, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("id, user_id, kor_coins_amount, status")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const previousStatus = existing?.status as
      | WithdrawalRequest["status"]
      | undefined;
    const { data: result, error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: data.status,
        admin_notes: data.admin_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    // If the request transitions to rejected/failed from a non-rejected state, refund coins
    const nowRejected = data.status === "rejected" || data.status === "failed";
    const wasRejected =
      previousStatus === "rejected" || previousStatus === "failed";
    if (nowRejected && !wasRejected && existing) {
      const { data: userRow } = await supabase
        .from("users")
        .select("kor_coins")
        .eq("id", existing.user_id)
        .single();
      const current = userRow?.kor_coins || 0;
      const refund = existing.kor_coins_amount || 0;
      const { error: refundError } = await supabase
        .from("users")
        .update({ kor_coins: current + refund })
        .eq("id", existing.user_id);
      if (refundError) {
        console.error("Failed to refund user balance:", refundError);
      }
    }

    return result;
  },

  // Mark payout as sent (or unset) without touching status
  async setPayoutSent(id: string, sent: boolean): Promise<WithdrawalRequest> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .update({ payout_sent: sent, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get withdrawal statistics
  async getWithdrawalStats(): Promise<WithdrawalStats> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("status, kor_coins_amount");

    if (error) throw error;

    const stats = {
      totalRequests: data.length,
      pendingRequests: data.filter((r) => r.status === "pending").length,
      verifiedRequests: data.filter((r) => r.status === "verified").length,
      completedRequests: data.filter((r) => r.status === "completed").length,
      totalAmount: data.reduce((sum, r) => sum + r.kor_coins_amount, 0),
    };

    return stats;
  },
};

// Hooks
export function useUserWithdrawalRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: WITHDRAWAL_KEYS.userRequests(user?.id || ""),
    queryFn: () => withdrawalApi.getUserWithdrawalRequests(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAllWithdrawalRequests() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: WITHDRAWAL_KEYS.allRequests(),
    queryFn: () => withdrawalApi.getAllWithdrawalRequests(),
    enabled: !!isAdmin,
    staleTime: 0, // Always consider data stale for realtime updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}

export function useWithdrawalRequest(id: string) {
  return useQuery({
    queryKey: WITHDRAWAL_KEYS.request(id),
    queryFn: () => withdrawalApi.getWithdrawalRequest(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUserBankAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: WITHDRAWAL_KEYS.userBankAccounts(user?.id || ""),
    queryFn: () => withdrawalApi.getUserBankAccounts(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes for bank accounts
  });
}

export function useBankAccount(id: string) {
  return useQuery({
    queryKey: WITHDRAWAL_KEYS.bankAccount(id),
    queryFn: () => withdrawalApi.getBankAccount(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWithdrawalStats() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: WITHDRAWAL_KEYS.stats(),
    queryFn: () => withdrawalApi.getWithdrawalStats(),
    enabled: !!isAdmin,
    staleTime: 2 * 60 * 1000,
  });
}

// Mutations
export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateBankAccountData) =>
      withdrawalApi.createBankAccount(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.userBankAccounts(user!.id),
      });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateBankAccountData>;
    }) => withdrawalApi.updateBankAccount(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.bankAccount(id),
      });
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.bankAccounts(),
      });
    },
  });
}

export function useVerifyBankAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VerifyBankAccountData }) =>
      withdrawalApi.verifyBankAccount(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.bankAccount(id),
      });
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.bankAccounts(),
      });
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: WITHDRAWAL_KEYS.userRequests(user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.allRequests(),
      });
      queryClient.invalidateQueries({ queryKey: WITHDRAWAL_KEYS.stats() });
    },
  });
}

export function useCreateWithdrawalRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateWithdrawalRequestData) =>
      withdrawalApi.createWithdrawalRequest(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.userRequests(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.allRequests(),
      });
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.stats(),
      });
      // Also refresh user balance immediately
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUpdateWithdrawalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWithdrawalStatusData;
    }) => withdrawalApi.updateWithdrawalStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.request(id),
      });
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.allRequests(),
      });
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.stats(),
      });
      // Refresh user balance on refund transitions
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useSetPayoutSent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sent }: { id: string; sent: boolean }) =>
      withdrawalApi.setPayoutSent(id, sent),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: WITHDRAWAL_KEYS.request(id) });
      queryClient.invalidateQueries({
        queryKey: WITHDRAWAL_KEYS.allRequests(),
      });
      queryClient.invalidateQueries({ queryKey: WITHDRAWAL_KEYS.stats() });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// Realtime subscriptions to reflect updates without manual refresh
export function useWithdrawalRealtimeSubscriptions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`withdrawal-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: WITHDRAWAL_KEYS.userRequests(user.id),
          });
          queryClient.invalidateQueries({ queryKey: WITHDRAWAL_KEYS.stats() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bank_accounts",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: WITHDRAWAL_KEYS.userRequests(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: WITHDRAWAL_KEYS.bankAccounts(),
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        () => {
          // User balance and derived values
          queryClient.invalidateQueries({ queryKey: ["user"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);
}

export function useAdminWithdrawalRealtimeSubscriptions() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) return;

    console.log("Admin withdrawal realtime: starting subscription...");
    const supabase = createClient();

    // Create a single channel for all admin realtime needs
    const channel = supabase
      .channel("admin-withdrawal-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "withdrawal_requests",
        },
        (payload) => {
          console.log("Admin realtime: NEW withdrawal request", payload.new);
          // Only invalidate queries, don't show toast
          queryClient.invalidateQueries({
            queryKey: WITHDRAWAL_KEYS.allRequests(),
          });
          queryClient.invalidateQueries({ queryKey: WITHDRAWAL_KEYS.stats() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "withdrawal_requests",
        },
        (payload) => {
          console.log(
            "Admin realtime: UPDATED withdrawal request",
            payload.new
          );
          // Only invalidate queries, don't show toast
          queryClient.invalidateQueries({
            queryKey: WITHDRAWAL_KEYS.allRequests(),
          });
          queryClient.invalidateQueries({ queryKey: WITHDRAWAL_KEYS.stats() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bank_accounts",
        },
        (payload) => {
          console.log("Admin realtime: bank_accounts change");
          // Bank account changes affect withdrawal display
          queryClient.invalidateQueries({
            queryKey: WITHDRAWAL_KEYS.allRequests(),
          });
        }
      );

    // Subscribe and handle connection
    channel.subscribe((status) => {
      console.log("Admin withdrawal realtime status:", status);
      if (status === "SUBSCRIBED") {
        console.log("Admin withdrawal realtime: successfully subscribed");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        console.log(
          "Admin withdrawal realtime: connection lost, attempting reconnect..."
        );
        // Simple reconnect on failure
        setTimeout(() => {
          channel.subscribe();
        }, 1000);
      }
    });

    return () => {
      console.log("Admin withdrawal realtime: cleaning up");
      supabase.removeChannel(channel);
    };
  }, [queryClient, isAdmin]);
}
