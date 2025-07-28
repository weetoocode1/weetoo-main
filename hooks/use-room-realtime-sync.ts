import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRoomRealtimeSync({
  roomId,
  initialRoomName,
  initialIsPublic,
  initialSymbol,
}: {
  roomId: string;
  initialRoomName: string;
  initialIsPublic: boolean;
  initialSymbol: string;
}) {
  const [roomName, setRoomName] = useState(initialRoomName);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [symbol, setSymbol] = useState(initialSymbol);

  useEffect(() => {
    setRoomName(initialRoomName);
    setIsPublic(initialIsPublic);
    setSymbol(initialSymbol);
  }, [initialRoomName, initialIsPublic, initialSymbol]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("room-realtime-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated) {
            if (typeof updated.name === "string") setRoomName(updated.name);
            if (typeof updated.privacy === "string")
              setIsPublic(updated.privacy === "public");
            if (typeof updated.symbol === "string") setSymbol(updated.symbol);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return {
    roomName,
    setRoomName,
    isPublic,
    setIsPublic,
    symbol,
    setSymbol,
  };
}
