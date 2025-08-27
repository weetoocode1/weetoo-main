import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Hook to verify DeepCoin UID via server-side API
export function useVerifyDeepCoinUID(
  uid: string | null,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ["deepcoin", "verify-uid", uid ? Number(uid) : null],
    queryFn: async () => {
      if (!uid) throw new Error("Missing UID");
      const uidNumber = Number(uid);
      if (!Number.isFinite(uidNumber)) throw new Error("UID must be a number");

      const response = await fetch("/api/deepcoin/verify-uid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: uidNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify UID");
      }

      const data = await response.json();
      return data.verified;
    },
    enabled: enabled && !!uid,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes - prevent frequent re-verification
    gcTime: 15 * 60 * 1000, // 15 minutes cache (React Query v5)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch when component mounts if data exists
  });
}

// Hook to get DeepCoin referral list
export function useDeepCoinReferrals(params?: {
  uid?: number;
  startTime?: number;
  endTime?: number;
}) {
  return useQuery({
    queryKey: ["deepcoin", "referrals", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.uid) queryParams.append("uid", params.uid.toString());
      if (params?.startTime)
        queryParams.append("startTime", params.startTime.toString());
      if (params?.endTime)
        queryParams.append("endTime", params.endTime.toString());

      const response = await fetch(
        `/api/deepcoin/referrals?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch referrals");
      }

      const data = await response.json();
      // Handle the wrapped response structure: { referrals: { code, msg, data } }
      return data.referrals?.data || data.data || data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get DeepCoin rebates summary
export function useDeepCoinRebates(params?: {
  uid?: number;
  startTime?: number;
  endTime?: number;
}) {
  return useQuery({
    queryKey: ["deepcoin", "rebates", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.uid) queryParams.append("uid", params.uid.toString());
      if (params?.startTime)
        queryParams.append("startTime", params.startTime.toString());
      if (params?.endTime)
        queryParams.append("endTime", params.endTime.toString());

      const response = await fetch(
        `/api/deepcoin/rebates?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch rebates");
      }

      const data = await response.json();
      // Handle the wrapped response structure: { rebates: { code, msg, data } }
      return data.rebates?.data || data.data || data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get DeepCoin detailed rebate list
export function useDeepCoinRebateList(params?: {
  uid?: number;
  type?: string;
  startTime?: number;
  endTime?: number;
  pageNum?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["deepcoin", "rebate-list", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.uid) queryParams.append("uid", params.uid.toString());
      if (params?.type) queryParams.append("type", params.type);
      if (params?.startTime)
        queryParams.append("startTime", params.startTime.toString());
      if (params?.endTime)
        queryParams.append("endTime", params.endTime.toString());
      if (params?.pageNum)
        queryParams.append("pageNum", params.pageNum.toString());
      if (params?.pageSize)
        queryParams.append("pageSize", params.pageSize.toString());

      const response = await fetch(
        `/api/deepcoin/rebate-list?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch rebate list");
      }

      const data = await response.json();
      return data.rebateList;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to refresh all DeepCoin data
export function useRefreshDeepCoinData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate and refetch all DeepCoin queries
      await queryClient.invalidateQueries({ queryKey: ["deepcoin"] });
    },
  });
}

// Hook to check if DeepCoin API should be active
export function useDeepCoinAPIActive(brokerId: string): boolean {
  return brokerId === "deepcoin";
}
