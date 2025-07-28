import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Crown, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  role: string;
  pending?: boolean;
}

interface JoinedParticipantRow {
  user_id: string;
  left_at: string | null;
  users: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    role?: string;
    status?: string;
  };
}

export function ParticipantsList({
  roomId,
  hostId,
}: {
  roomId: string;
  hostId: string;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // SWR fetcher for participants
  const fetchParticipants = async () => {
    const supabase = supabaseRef.current;
    const { data: participantRows, error } = await supabase
      .from("trading_room_participants")
      .select(
        "user_id, left_at, users(id, first_name, last_name, avatar_url, role, status)"
      )
      .eq("room_id", roomId)
      .is("left_at", null);
    if (error || !participantRows) {
      return [];
    }
    // Map joined user info
    const mapped = (participantRows as unknown as JoinedParticipantRow[]).map(
      (row) => {
        const user = row.users;
        return {
          id: user.id,
          name:
            [user.first_name, user.last_name].filter(Boolean).join(" ") || "-",
          avatar: user.avatar_url || "",
          isOnline: user.status === "Active",
          role: user.role || "member",
          pending: row.left_at === null && user.id === currentUserId,
        };
      }
    );
    // Sort so host is at the top
    mapped.sort((a, b) => {
      if (a.id === hostId) return -1;
      if (b.id === hostId) return 1;
      return 0;
    });
    return mapped;
  };

  const { data: participants = [], isLoading } = useSWR(
    ["participants", roomId],
    fetchParticipants
  );

  // Realtime subscription: on any event, call mutate to refetch
  useEffect(() => {
    const channel = supabaseRef.current
      .channel("room-participants-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_room_participants",
          filter: `room_id=eq.${roomId}`,
        },
        async (_payload) => {
          mutate(["participants", roomId]);
        }
      )
      .subscribe();
    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, [roomId]);

  const handleJoinRoom = async () => {
    if (!currentUserId) {
      toast.error("Please log in to join the room.", {
        description: "You must be logged in to participate.",
      });
      return;
    }
    // Optimistic UI: add current user to the list instantly with pending state
    mutate(
      ["participants", roomId],
      (current: Participant[] = []) => {
        if (current.some((p) => p.id === currentUserId)) return current;
        return [
          ...current,
          {
            id: currentUserId,
            name: "You", // Optionally fetch/display real name
            avatar: "",
            isOnline: true,
            role: "participant",
            pending: true,
          },
        ];
      },
      false
    );
    // Insert to Supabase
    const supabase = supabaseRef.current;
    const { error } = await supabase.from("trading_room_participants").insert({
      room_id: roomId,
      user_id: currentUserId,
    });
    // After insert, revalidate to get real data
    mutate(["participants", roomId], undefined, { revalidate: true });
    if (error) {
      // Roll back optimistic update if error
      mutate(["participants", roomId], undefined, { revalidate: true });
      toast.error("Failed to join room.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background sticky top-0 z-10 select-none">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Participants</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {participants.length}
        </span>
      </div>
      <ScrollArea className="flex-1 overflow-y-auto select-none">
        <div className="p-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading...
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No participants yet.
            </div>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage
                      src={participant.avatar}
                      alt={participant.name}
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {participant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium flex items-center gap-1">
                    {participant.name}
                    {participant.pending && (
                      <svg
                        className="animate-spin h-3 w-3 text-muted-foreground ml-1"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    )}
                  </span>
                  <div className="text-xs text-muted-foreground capitalize">
                    {participant.id === hostId ? (
                      <div className="flex items-center gap-0">
                        <span>Host</span>
                        <Crown className="inline-block ml-1 h-3 w-3 text-amber-400 align-text-bottom" />
                      </div>
                    ) : (
                      "Participant"
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Show join button for not-logged-in users */}
          {!currentUserId && (
            <div className="flex justify-center mt-4">
              <button
                className="px-4 py-2 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
                onClick={handleJoinRoom}
              >
                Join Room
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
