import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect } from "react";
import useSWR from "swr";

export function usePositions(roomId: string) {
  const supabase = createClient();

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
    const { data, error } = await supabase
      .from("trading_room_positions")
      .select("*")
      .eq("room_id", roomId)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false });
    if (error) throw error;
    return data;
  };

  const {
    data: openPositions,
    mutate: mutateOpen,
    isLoading: loadingOpen,
    error: errorOpen,
  } = useSWR(["open-positions", roomId], fetchOpen);

  const {
    data: closedPositions,
    mutate: mutateClosed,
    isLoading: loadingClosed,
    error: errorClosed,
  } = useSWR(["closed-positions", roomId], fetchClosed);

  // Realtime subscription for open/closed positions
  useEffect(() => {
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
          mutateOpen();
          mutateClosed();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, mutateOpen, mutateClosed, supabase]);

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
      if (rpcError) throw rpcError;
      mutateOpen();
      mutateClosed();
    },
    [supabase, mutateOpen, mutateClosed]
  );

  // Close all positions function
  const closeAllPositions = useCallback(
    async (closePrice: number) => {
      if (!openPositions || openPositions.length === 0) return;
      await Promise.all(
        openPositions.map((pos) => closePosition(pos.id, closePrice))
      );
      mutateOpen();
      mutateClosed();
    },
    [openPositions, closePosition, mutateOpen, mutateClosed]
  );

  return {
    openPositions: openPositions || [],
    closedPositions: closedPositions || [],
    loadingOpen,
    loadingClosed,
    errorOpen,
    errorClosed,
    closePosition,
    closeAllPositions,
  };
}
