import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import useSWR from "swr";

export const VIRTUAL_BALANCE_KEY = (roomId: string) => [
  "virtual-balance",
  roomId,
];

const fetchBalance = async (roomId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("trading_rooms")
    .select("virtual_balance")
    .eq("id", roomId)
    .single();
  return data?.virtual_balance ?? 0;
};

export function useVirtualBalance(roomId: string) {
  const { data: balance, mutate } = useSWR(
    roomId ? VIRTUAL_BALANCE_KEY(roomId) : null,
    () => fetchBalance(roomId)
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
          mutate(); // Refetch balance instantly on realtime update
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, mutate]);

  return balance !== null && balance !== undefined
    ? Math.max(0, balance)
    : balance;
}
