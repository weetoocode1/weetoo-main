import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
export interface BrokerRebateWithdrawal {
  id: string;
  amount_usd: number;
  currency: string;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "processing"
    | "completed"
    | "failed";
  exchange_id: string;
  broker_uid: string;
  user_broker_uid_id: string;
  processed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_broker_uids: {
    exchange_id: string;
    uid: string;
  };
}

export interface CreateWithdrawalRequest {
  user_broker_uid_id: string;
  amount_usd: number;
}

export interface UpdateWithdrawalRequest {
  id: string;
  status: "approved" | "rejected" | "processing" | "completed" | "failed";
  admin_notes?: string;
}

// Fetch user's withdrawal history
export function useBrokerRebateWithdrawals() {
  return useQuery<BrokerRebateWithdrawal[]>({
    queryKey: ["broker-rebate-withdrawals"],
    queryFn: async () => {
      const response = await fetch("/api/broker-rebate-withdrawals");
      if (!response.ok) {
        throw new Error("Failed to fetch withdrawals");
      }
      const data = await response.json();
      return data.withdrawals;
    },
  });
}

// Create new withdrawal request
export function useCreateBrokerRebateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateWithdrawalRequest) => {
      const response = await fetch("/api/broker-rebate-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create withdrawal request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["broker-rebate-withdrawals"],
      });
      queryClient.invalidateQueries({ queryKey: ["user-uids"] }); // Refresh UID data to show updated balance
      toast.success("Withdrawal request submitted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Fetch all withdrawal requests
export function useAdminBrokerRebateWithdrawals(status?: string) {
  return useQuery<{
    withdrawals: BrokerRebateWithdrawal[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["admin-broker-rebate-withdrawals", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);

      const response = await fetch(
        `/api/admin/broker-rebate-withdrawals?${params}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch withdrawals");
      }
      return response.json();
    },
  });
}

// Admin: Update withdrawal status
export function useUpdateBrokerRebateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateWithdrawalRequest) => {
      const response = await fetch("/api/admin/broker-rebate-withdrawals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update withdrawal");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-broker-rebate-withdrawals"],
      });
      toast.success("Withdrawal status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
