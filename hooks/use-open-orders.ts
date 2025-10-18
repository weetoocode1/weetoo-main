import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

const QUERY_KEYS = {
  openOrders: (roomId: string, symbol?: string) => [
    "open-orders",
    roomId,
    symbol,
  ],
} as const;

export function useOpenOrders(
  roomId: string,
  options?: { symbol?: string; status?: string }
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.openOrders(roomId, options?.symbol),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.append("status", options.status);
      if (options?.symbol) params.append("symbol", options.symbol);

      const response = await fetch(
        `/api/trading-room/${roomId}/open-orders?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch open orders");

      return response.json();
    },
    enabled: !!roomId,
    staleTime: 30 * 1000, // 30 seconds - open orders change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cached data if available
  });

  // Set up Supabase Realtime subscription for instant updates
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`open-orders-realtime-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_open_orders",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // Invalidate and refetch the query
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.openOrders(roomId, options?.symbol),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, options?.symbol, queryClient]);

  return query;
}
