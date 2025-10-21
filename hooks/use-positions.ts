import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface UsePositionsOptions {
  sinceResetAt?: string; // ISO timestamp; when provided, only return closed positions since this time
}

const QUERY_KEYS = {
  openPositions: (roomId: string) => ["open-positions", roomId],
  closedPositions: (roomId: string, sinceResetAt?: string) => [
    "closed-positions",
    roomId,
    sinceResetAt,
  ],
} as const;

export function usePositions(roomId: string, options?: UsePositionsOptions) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch open positions
  const fetchOpen = async () => {
    const { data, error } = await supabase
      .from("trading_room_positions")
      .select("*")
      .eq("room_id", roomId)
      .is("closed_at", null)
      .order("opened_at", { ascending: false });
    if (error) throw error;
    return data;
  };

  // Fetch closed positions (history)
  const fetchClosed = async () => {
    let query = supabase
      .from("trading_room_positions")
      .select("*")
      .eq("room_id", roomId)
      .not("closed_at", "is", null);

    if (options?.sinceResetAt) {
      query = query.gte("closed_at", options.sinceResetAt);
    }

    const { data, error } = await query.order("closed_at", {
      ascending: false,
    });
    if (error) throw error;
    return data;
  };

  // Open positions query
  const {
    data: openPositions,
    isLoading: loadingOpen,
    error: errorOpen,
  } = useQuery({
    queryKey: QUERY_KEYS.openPositions(roomId),
    queryFn: fetchOpen,
    enabled: !!roomId,
    staleTime: 20 * 1000, // 20 seconds - positions change moderately
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 45 * 1000, // Refetch every 45 seconds as backup
  });

  // Closed positions query
  const {
    data: closedPositions,
    isLoading: loadingClosed,
    error: errorClosed,
  } = useQuery({
    queryKey: QUERY_KEYS.closedPositions(roomId, options?.sinceResetAt),
    queryFn: fetchClosed,
    enabled: !!roomId,
    staleTime: 30 * 1000, // 30 seconds - history changes less frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes as backup
  });

  // Realtime subscription for open/closed positions
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel("positions-room-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_positions",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // Invalidate both queries to trigger refetch
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.openPositions(roomId),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.closedPositions(roomId, options?.sinceResetAt),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient, options?.sinceResetAt]);

  // Close position function
  const closePosition = useCallback(
    async (positionId: string, closePrice: number) => {
      const { error: rpcError } = await supabase.rpc(
        "close_position_and_update_balance",
        {
          p_position_id: positionId,
          p_close_price: closePrice,
        }
      );

      if (rpcError) {
        throw new Error(`Failed to close position: ${rpcError.message}`);
      }

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.openPositions(roomId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.closedPositions(roomId, options?.sinceResetAt),
      });
    },
    [supabase, queryClient, roomId, options?.sinceResetAt]
  );

  return {
    openPositions: openPositions || [],
    closedPositions: closedPositions || [],
    loadingOpen,
    loadingClosed,
    errorOpen,
    errorClosed,
    closePosition,
  };
}
