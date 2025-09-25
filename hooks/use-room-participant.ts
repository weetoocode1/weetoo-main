import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

interface User {
  id: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function useRoomParticipant(roomId: string, user: User | null) {
  const [isParticipant, setIsParticipant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isJoiningRef = useRef(false);
  const hasCheckedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !roomId) {
      setIsParticipant(false);
      setIsLoading(false);
      hasCheckedRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    // Check if user ID changed (user loaded or changed)
    const userIdChanged = lastUserIdRef.current !== user.id;

    // Reset check status if user changed
    if (userIdChanged) {
      hasCheckedRef.current = false;
      lastUserIdRef.current = user.id;
    }

    // Prevent re-checking on every tab focus if we already know the status and user hasn't changed
    if (hasCheckedRef.current && isParticipant && !userIdChanged) {
      return;
    }

    let isMounted = true;

    const checkParticipantStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("trading_room_participants")
          .select("id")
          .eq("room_id", roomId)
          .eq("user_id", user.id)
          .is("left_at", null)
          .maybeSingle();

        if (queryError) {
          console.error("Error checking participant status:", queryError);
          setError(queryError.message);
        } else if (isMounted) {
          const isParticipantNow = !!data;
          console.log("Participant status check:", {
            userId: user.id,
            roomId,
            isParticipant: isParticipantNow,
            data,
          });
          setIsParticipant(isParticipantNow);
          hasCheckedRef.current = true;
        }
      } catch (err) {
        console.error("Error in checkParticipantStatus:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkParticipantStatus();

    // Subscribe to real-time participant changes
    const supabase = createClient();
    const channel = supabase
      .channel(`room-participant-${roomId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_room_participants",
          filter: `room_id=eq.${roomId} AND user_id=eq.${user.id}`,
        },
        () => {
          if (isMounted) {
            setIsParticipant(true);
            setError(null);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_room_participants",
          filter: `room_id=eq.${roomId} AND user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isMounted) {
            // If left_at is set, user left the room
            if (payload.new.left_at) {
              setIsParticipant(false);
              hasCheckedRef.current = false;
            } else {
              setIsParticipant(true);
              setError(null);
              hasCheckedRef.current = true;
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, roomId]);

  const joinRoom = useCallback(async () => {
    if (!user || !roomId) return false;
    if (isJoiningRef.current) return false;

    isJoiningRef.current = true;
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      // Check if already a participant
      const { data: existing } = await supabase
        .from("trading_room_participants")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .is("left_at", null)
        .maybeSingle();

      if (existing) {
        setIsParticipant(true);
        hasCheckedRef.current = true;
        return true;
      }

      // Join the room
      const { error } = await supabase
        .from("trading_room_participants")
        .insert({
          room_id: roomId,
          user_id: user.id,
        });

      if (error) {
        if (error.code === "23505") {
          // User already in room (race condition)
          setIsParticipant(true);
          hasCheckedRef.current = true;
          return true;
        } else {
          setError(error.message);
          return false;
        }
      } else {
        setIsParticipant(true);
        hasCheckedRef.current = true;
        return true;
      }
    } catch (err) {
      console.error("Error joining room:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
      isJoiningRef.current = false;
    }
  }, [user, roomId]);

  return {
    isParticipant,
    isLoading,
    error,
    joinRoom,
  };
}
