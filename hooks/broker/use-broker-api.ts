// Universal hooks that work for any broker

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BrokerType,
  UIDVerificationResult,
  CommissionData,
  ReferralData,
  TradingHistory,
} from "@/lib/broker/broker-types";
import { BrokerFactory } from "@/lib/broker/broker-factory";

// Universal broker hook that works for any broker and action
export function useBroker(
  brokerType: string,
  action: string,
  uid?: string,
  sourceType?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["broker", brokerType, action, uid, sourceType],
    queryFn: async () => {
      const response = await fetch("/api/broker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          broker: brokerType,
          action,
          uid,
          sourceType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    enabled: enabled && !!brokerType && !!action,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Specific hooks for common actions
export function useBrokerUIDVerification(
  brokerType: string,
  uid: string,
  enabled = true
) {
  return useBroker(brokerType, "verifyUID", uid, undefined, enabled);
}

export function useBrokerCommissionData(
  brokerType: string,
  uid: string,
  sourceType?: string,
  enabled = true
) {
  return useBroker(brokerType, "getCommissionData", uid, sourceType, enabled);
}

export function useBrokerTradingHistory(
  brokerType: string,
  uid: string,
  enabled = true
) {
  return useBroker(brokerType, "getTradingHistory", uid, undefined, enabled);
}

export function useBrokerTradingVolume(
  brokerType: string,
  uid: string,
  enabled = true
) {
  return useBroker(brokerType, "getTradingVolume", uid, undefined, enabled);
}

export function useBrokerReferrals(brokerType: string, enabled = true) {
  return useBroker(brokerType, "getReferrals", undefined, undefined, enabled);
}

// Refresh hook for any broker
export function useRefreshBrokerData(brokerType: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all queries for this broker
      await queryClient.invalidateQueries({
        queryKey: ["broker", brokerType],
      });
    },
  });
}

// Check if broker API is active
export function useBrokerAPIActive(brokerType: string) {
  return useQuery({
    queryKey: ["broker", brokerType, "api-active"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/broker", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            broker: brokerType,
            action: "isAPIActive",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data === true;
        }
        return false;
      } catch {
        return false;
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Get available brokers
export function useAvailableBrokers() {
  return useQuery({
    queryKey: ["brokers", "available"],
    queryFn: () => BrokerFactory.getAvailableBrokers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
