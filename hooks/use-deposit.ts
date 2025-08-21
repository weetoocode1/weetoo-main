"use client";

import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export interface DepositRequest {
  id: string;
  user_id: string;
  bank_account_id: string;
  kor_coins_amount: number;
  won_amount: number;
  vat_amount: number;
  total_amount: number;
  status:
    | "pending"
    | "verification_sent"
    | "verified"
    | "approved"
    | "completed"
    | "rejected"
    | "failed";
  verification_amount?: number | null;
  created_at: string;
  updated_at: string;
  bank_account?: {
    id: string;
    account_number?: string | null;
    bank_name?: string | null;
    is_verified?: boolean | null;
    verification_amount?: number | null;
  } | null;
  user?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    level?: number | null;
    kor_coins?: number | null;
  } | null;
}

export interface CreateDepositRequestData {
  user_id: string;
  bank_account_id: string;
  kor_coins_amount: number;
  won_amount: number;
  vat_amount: number;
  total_amount: number;
}

export interface UpdateDepositStatusData {
  id: string;
  status: DepositRequest["status"];
  admin_notes?: string;
}

export interface SendVerificationData {
  id: string;
}

export interface DepositStats {
  totalRequests: number;
  pendingRequests: number;
  verificationSentRequests: number;
  verifiedRequests: number;
  approvedRequests: number;
  completedRequests: number;
}

const KEYS = {
  all: ["deposit"] as const,
  list: () => [...KEYS.all, "list"] as const,
  stats: () => [...KEYS.all, "stats"] as const,
};

export function useAllDepositRequests() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: async (): Promise<DepositRequest[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("deposit_requests")
        .select(
          `*, bank_account:bank_accounts(*), user:users(id, first_name, last_name, avatar_url, level, kor_coins)`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as DepositRequest[]) || [];
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useCreateDepositRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDepositRequestData) => {
      const supabase = createClient();
      // Check bank account verification state
      const { data: bank, error: bankErr } = await supabase
        .from("bank_accounts")
        .select("id, is_verified, verification_amount")
        .eq("id", payload.bank_account_id)
        .single();
      if (bankErr) throw bankErr;

      // For unverified bank accounts, ensure a verification amount exists (mirror withdrawal)
      if (!bank?.is_verified && typeof bank?.verification_amount !== "number") {
        const generate = () => {
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
        const newAmount = generate();
        const { error: upErr } = await supabase
          .from("bank_accounts")
          .update({ verification_amount: newAmount })
          .eq("id", payload.bank_account_id);
        if (upErr) throw upErr;
      }

      // If bank is not verified, ensure a verification_amount exists on the bank account
      let verificationAmount: number | null = null;
      if (!bank?.is_verified) {
        const ensureGenerate = () => {
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
        verificationAmount =
          typeof bank?.verification_amount === "number"
            ? Number((bank.verification_amount as number).toFixed(4))
            : ensureGenerate();
        if (typeof bank?.verification_amount !== "number") {
          const { error: upErr } = await supabase
            .from("bank_accounts")
            .update({ verification_amount: verificationAmount })
            .eq("id", payload.bank_account_id);
          if (upErr) throw upErr;
        }
      }

      // Insert with status based on bank verification (mirror withdrawal flow)
      const { data, error } = await supabase
        .from("deposit_requests")
        .insert({
          ...payload,
          status: bank?.is_verified ? "verified" : "pending",
        })
        .select("*")
        .single();
      if (error) throw error;
      const row = data as DepositRequest;

      // Insert admin notification (same pattern as withdrawals)
      try {
        const { data: userRow } = await supabase
          .from("users")
          .select("first_name, last_name, nickname, email")
          .eq("id", row.user_id)
          .single();
        const displayName =
          userRow?.first_name || userRow?.last_name
            ? `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim()
            : userRow?.nickname || userRow?.email || "User";
        await supabase.from("notifications").insert({
          user_id: row.user_id,
          audience: "admin",
          type: "deposit_request_created",
          title: "New Deposit Request",
          body: `${displayName} requested ${row.kor_coins_amount.toLocaleString()} KOR`,
          metadata: {
            user_id: row.user_id,
            user_name: displayName,
            kor_coins_amount: row.kor_coins_amount,
            deposit_request_id: row.id,
          },
          read: false,
        });
      } catch (e) {
        console.warn("Deposit notification insert failed", e);
      }

      return row;
    },
    onSuccess: async (_row) => {
      qc.invalidateQueries({ queryKey: KEYS.list() });
      qc.invalidateQueries({ queryKey: KEYS.stats() });
    },
  });
}

export function useUpdateDepositStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateDepositStatusData) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("deposit_requests")
        .update({ status: payload.status })
        .eq("id", payload.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as DepositRequest;
    },
    onSuccess: async (row) => {
      try {
        const supabase = createClient();
        await supabase.from("notifications").insert({
          audience: "admin",
          type: "deposit_status_updated",
          title: "Deposit Status Updated",
          metadata: {
            deposit_request_id: row.id,
            new_status: row.status,
            kor_coins_amount: row.kor_coins_amount,
          },
        });
      } catch {}
      qc.invalidateQueries({ queryKey: KEYS.list() });
      qc.invalidateQueries({ queryKey: KEYS.stats() });
    },
  });
}

export function useSendVerificationAmount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendVerificationData) => {
      const supabase = createClient();

      // Fetch deposit with linked bank account
      const { data: dep, error: depErr } = await supabase
        .from("deposit_requests")
        .select(
          "id, bank_account_id, bank_account:bank_accounts(id, verification_amount)"
        )
        .eq("id", payload.id)
        .single();
      if (depErr) throw depErr;

      // Ensure a secure verification amount exists on the bank account
      const ensureGenerate = () => {
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

      let v = (dep as any)?.bank_account?.verification_amount as
        | number
        | null
        | undefined;
      if (typeof v !== "number") {
        const newV = ensureGenerate();
        const { error: updErr } = await supabase
          .from("bank_accounts")
          .update({ verification_amount: newV })
          .eq("id", (dep as any).bank_account_id);
        if (updErr) throw updErr;
        v = newV;
      }

      // Update the deposit request with the verification amount and status
      const { data, error } = await supabase
        .from("deposit_requests")
        .update({ status: "verification_sent", verification_amount: v })
        .eq("id", payload.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as DepositRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list() });
    },
  });
}

export function useSendKorCoins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (depositId: string) => {
      const supabase = createClient();
      // fetch deposit
      const { data: dep, error: depErr } = await supabase
        .from("deposit_requests")
        .select("*, user:users(id, kor_coins)")
        .eq("id", depositId)
        .single();
      if (depErr) throw depErr;
      // credit user
      const { error: uErr } = await supabase
        .from("users")
        .update({
          kor_coins: (dep.user?.kor_coins || 0) + (dep.kor_coins_amount || 0),
        })
        .eq("id", dep.user_id);
      if (uErr) throw uErr;
      // mark completed
      const { error: upErr } = await supabase
        .from("deposit_requests")
        .update({ status: "completed" })
        .eq("id", depositId);
      if (upErr) throw upErr;
      return { success: true } as const;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list() });
      qc.invalidateQueries({ queryKey: KEYS.stats() });
      // Also invalidate user query to refresh kor_coins in UI
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useDepositStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: async (): Promise<DepositStats> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("status");
      if (error) throw error;
      const rows = (data || []) as { status: DepositRequest["status"] }[];
      const count = (s: DepositRequest["status"]) =>
        rows.filter((r) => r.status === s).length;
      return {
        totalRequests: rows.length,
        pendingRequests: count("pending"),
        verificationSentRequests: count("verification_sent"),
        verifiedRequests: count("verified"),
        approvedRequests: count("approved"),
        completedRequests: count("completed"),
      };
    },
  });
}

export function useAdminDepositRealtimeSubscriptions() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-deposit-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deposit_requests" },
        () => {
          qc.invalidateQueries({ queryKey: KEYS.list() });
          qc.invalidateQueries({ queryKey: KEYS.stats() });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposit_requests" },
        () => {
          qc.invalidateQueries({ queryKey: KEYS.list() });
          qc.invalidateQueries({ queryKey: KEYS.stats() });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_accounts" },
        () => {
          qc.invalidateQueries({ queryKey: KEYS.list() });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
