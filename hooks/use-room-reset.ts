import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RoomResetMarker {
  id: string;
  room_id: string;
  reset_at: string; // ISO timestamp
  reset_start_balance: number;
  initiated_by: string;
  note?: string | null;
  reset_virtual_balance_snapshot?: number | null;
  created_at: string;
  updated_at: string;
}

const latestResetQueryKey = (roomId: string) => ["room-latest-reset", roomId];

export const useLatestRoomReset = (roomId: string | undefined) => {
  return useQuery<{ latest?: RoomResetMarker }, Error>({
    queryKey: latestResetQueryKey(roomId || ""),
    enabled: Boolean(roomId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("room_history_resets")
        .select("*")
        .eq("room_id", roomId)
        .order("reset_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = No rows
        throw error as unknown as Error;
      }
      return { latest: data as unknown as RoomResetMarker | undefined };
    },
  });
};

export interface PerformResetParams {
  roomId: string;
  initiatedBy: string;
  resetStartBalance: number;
  note?: string;
}

export const usePerformRoomReset = () => {
  const queryClient = useQueryClient();

  return useMutation<{ inserted?: RoomResetMarker }, Error, PerformResetParams>(
    {
      mutationFn: async ({ roomId, initiatedBy, resetStartBalance, note }) => {
        const supabase = createClient();

        // Snapshot the room's current virtual_balance at reset time
        const { data: roomData, error: roomErr } = await supabase
          .from("trading_rooms")
          .select("virtual_balance")
          .eq("id", roomId)
          .maybeSingle();
        if (roomErr) throw roomErr as unknown as Error;
        const snapshot = Number(roomData?.virtual_balance ?? 0);

        const { data, error } = await supabase
          .from("room_history_resets")
          .insert({
            room_id: roomId,
            initiated_by: initiatedBy,
            reset_start_balance: resetStartBalance,
            reset_virtual_balance_snapshot: snapshot,
            note: note ?? null,
          })
          .select()
          .single();

        if (error) throw error as unknown as Error;
        return { inserted: data as unknown as RoomResetMarker };
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: latestResetQueryKey(variables.roomId),
        });
      },
    }
  );
};
