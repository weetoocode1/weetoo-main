import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface TpSlOrder {
  id: string;
  position_id: string;
  trading_room_id: string;
  user_id: string;
  order_type: "take_profit" | "stop_loss";
  side: "long" | "short";
  quantity: number;
  trigger_price: number;
  order_price?: number;
  status: "pending" | "active" | "executed" | "cancelled" | "failed";
  execution_price?: number;
  executed_at?: string;
  created_at: string;
  updated_at: string;
}

interface CreateTpSlOrderParams {
  position_id: string;
  order_type: "take_profit" | "stop_loss";
  side: "long" | "short";
  quantity: number;
  trigger_price: number;
  order_price?: number;
}

interface UpdateTpSlOrderParams {
  trigger_price?: number;
  order_price?: number;
  status?: "pending" | "active" | "cancelled";
}

// Hook to fetch TP/SL orders for a trading room
export function useTpSlOrders(tradingRoomId: string, positionId?: string) {
  return useQuery({
    queryKey: ["tp-sl-orders", tradingRoomId, positionId],
    queryFn: async (): Promise<TpSlOrder[]> => {
      const url = new URL(
        `/api/trading-room/${tradingRoomId}/tp-sl-orders`,
        window.location.origin
      );
      if (positionId) {
        url.searchParams.set("position_id", positionId);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to fetch TP/SL orders");
      }

      const data = await response.json();
      return data.orders;
    },
    enabled: !!tradingRoomId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}

// Hook to create a TP/SL order
export function useCreateTpSlOrder(tradingRoomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTpSlOrderParams): Promise<TpSlOrder> => {
      const response = await fetch(
        `/api/trading-room/${tradingRoomId}/tp-sl-orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create TP/SL order");
      }

      const data = await response.json();
      return data.order;
    },
    onSuccess: () => {
      // Invalidate and refetch TP/SL orders
      queryClient.invalidateQueries({
        queryKey: ["tp-sl-orders", tradingRoomId],
      });
    },
  });
}

// Hook to update a TP/SL order
export function useUpdateTpSlOrder(tradingRoomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      params,
    }: {
      orderId: string;
      params: UpdateTpSlOrderParams;
    }): Promise<TpSlOrder> => {
      const response = await fetch(
        `/api/trading-room/${tradingRoomId}/tp-sl-orders/${orderId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update TP/SL order");
      }

      const data = await response.json();
      return data.order;
    },
    onSuccess: () => {
      // Invalidate and refetch TP/SL orders
      queryClient.invalidateQueries({
        queryKey: ["tp-sl-orders", tradingRoomId],
      });
    },
  });
}

// Hook to cancel a TP/SL order
export function useCancelTpSlOrder(tradingRoomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string): Promise<TpSlOrder> => {
      const response = await fetch(
        `/api/trading-room/${tradingRoomId}/tp-sl-orders/${orderId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel TP/SL order");
      }

      const data = await response.json();
      return data.order;
    },
    onSuccess: () => {
      // Invalidate and refetch TP/SL orders
      queryClient.invalidateQueries({
        queryKey: ["tp-sl-orders", tradingRoomId],
      });
    },
  });
}

// Hook to activate TP/SL orders for a position
export function useActivateTpSlOrders(tradingRoomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionId: string): Promise<void> => {
      // Get all pending TP/SL orders for this position
      const orders = await queryClient.fetchQuery({
        queryKey: ["tp-sl-orders", tradingRoomId, positionId],
        queryFn: async (): Promise<TpSlOrder[]> => {
          const url = new URL(
            `/api/trading-room/${tradingRoomId}/tp-sl-orders`,
            window.location.origin
          );
          url.searchParams.set("position_id", positionId);

          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error("Failed to fetch TP/SL orders");
          }

          const data = await response.json();
          return data.orders;
        },
      });

      // Activate all pending orders
      const updatePromises =
        orders
          ?.filter((order: TpSlOrder) => order.status === "pending")
          .map((order: TpSlOrder) =>
            fetch(
              `/api/trading-room/${tradingRoomId}/tp-sl-orders/${order.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "active" }),
              }
            )
          ) || [];

      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      // Invalidate and refetch TP/SL orders
      queryClient.invalidateQueries({
        queryKey: ["tp-sl-orders", tradingRoomId],
      });
    },
  });
}
