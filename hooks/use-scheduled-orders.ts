import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

const QUERY_KEYS = {
  scheduledOrders: (roomId: string) => ["scheduled-orders", roomId],
  scheduledOrder: (roomId: string, orderId: string) => [
    "scheduled-order",
    roomId,
    orderId,
  ],
} as const;

export function useScheduledOrders(
  roomId: string,
  options?: { status?: string; limit?: number; offset?: number }
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.scheduledOrders(roomId),
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const params = new URLSearchParams();
      options?.status && params.append("status", options.status);
      options?.limit && params.append("limit", options.limit.toString());
      options?.offset && params.append("offset", options.offset.toString());

      const response = await fetch(
        `/api/trading-room/${roomId}/scheduled-orders?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch scheduled orders");

      return response.json();
    },
    enabled: !!roomId,
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 300000,
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Set up Supabase Realtime subscription for instant updates
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`scheduled-orders-realtime-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_scheduled_orders",
          filter: `trading_room_id=eq.${roomId}`,
        },
        (payload) => {
          // Invalidate and refetch the query
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.scheduledOrders(roomId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return query;
}

export function useCreateScheduledOrder(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch(
        `/api/trading-room/${roomId}/scheduled-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create scheduled order");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.scheduledOrders(roomId),
      });
    },
  });
}

export function useCancelScheduledOrder(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(
        `/api/trading-room/${roomId}/scheduled-orders/${orderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel scheduled order");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.scheduledOrders(roomId),
      });
    },
  });
}

export function useExecuteScheduledOrder(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      currentPrice,
    }: {
      orderId: string;
      currentPrice: number;
    }) => {
      const response = await fetch(
        `/api/trading-room/${roomId}/scheduled-orders/${orderId}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_time: new Date().toISOString(),
            current_price: currentPrice,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to execute scheduled order");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.scheduledOrders(roomId),
      });
    },
  });
}

export function useDeleteScheduledOrder(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(
        `/api/trading-room/${roomId}/scheduled-orders/${orderId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete scheduled order");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.scheduledOrders(roomId),
      });
    },
  });
}
