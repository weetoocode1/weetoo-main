import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import useSWR, { mutate } from "swr";

export const VIRTUAL_BALANCE_KEY = (roomId: string) => [
  "virtual-balance",
  roomId,
];

const fetchBalance = async (roomId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("trading_rooms")
    .select("virtual_balance")
    .eq("id", roomId)
    .single();

  if (error) {
    console.error("Error fetching virtual balance:", error);
    return 0;
  }

  const balance = data?.virtual_balance ?? 0;
  console.log(`Fetched virtual balance for room ${roomId}:`, balance);
  return balance;
};

export function useVirtualBalance(roomId: string) {
  const { data: balance, mutate } = useSWR(
    roomId ? VIRTUAL_BALANCE_KEY(roomId) : null,
    () => fetchBalance(roomId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // Reduce caching to 1 second
      refreshInterval: 5000, // Refresh every 5 seconds as fallback
    }
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("trading_rooms_balance_" + roomId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Virtual balance realtime update:", payload);
          // Invalidate cache for all clients with this room's balance
          mutate(VIRTUAL_BALANCE_KEY(roomId));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return balance !== null && balance !== undefined
    ? Math.max(0, balance)
    : balance;
}
