import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// OrangeX API hooks following the same pattern as DeepCoin
export function useVerifyOrangeXUID(uid: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ["orangex", "verify-uid", uid],
    queryFn: async () => {
      const response = await fetch("/api/orangex/verify-uid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        throw new Error(`Failed to verify OrangeX UID: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: enabled && !!uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useOrangeXTradingHistory(
  uid: string,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ["orangex", "trading-history", uid],
    queryFn: async () => {
      const response = await fetch("/api/orangex/trading-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch OrangeX trading history: ${response.statusText}`
        );
      }

      return response.json();
    },
    enabled: enabled && !!uid,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOrangeXCommissionData(
  uid: string,
  sourceType: "PERPETUAL" | "CopyTrading" | "SPOT" = "PERPETUAL",
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ["orangex", "commission", uid, sourceType],
    queryFn: async () => {
      const response = await fetch("/api/orangex/commission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid, sourceType }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch OrangeX commission data: ${response.statusText}`
        );
      }

      return response.json();
    },
    enabled: enabled && !!uid,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOrangeXSpotCommissionData(
  uid: string,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ["orangex", "spot-commission", uid],
    queryFn: async () => {
      const response = await fetch("/api/orangex/spot-commission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch OrangeX spot commission data: ${response.statusText}`
        );
      }

      return response.json();
    },
    enabled: enabled && !!uid,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOrangeXAccountInfo(enabled: boolean = false) {
  return useQuery({
    queryKey: ["orangex", "account-info"],
    queryFn: async () => {
      const response = await fetch("/api/orangex/account-info", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch OrangeX account info: ${response.statusText}`
        );
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRefreshOrangeXData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all OrangeX queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["orangex"] });
    },
  });
}

export function useOrangeXAPIActive(enabled: boolean = true) {
  // Check if OrangeX API is configured
  return useQuery({
    queryKey: ["orangex", "api-active"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/orangex/verify-uid", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uid: "test" }),
        });

        // If we get a response (even error), API is configured
        return true;
      } catch (error) {
        // If we get an error about missing credentials, API is not configured
        return false;
      }
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
