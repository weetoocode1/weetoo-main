import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Crown, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const t = useTranslations("room.participants");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const presenceChannelRef = useRef<ReturnType<
    typeof supabaseRef.current.channel
  > | null>(null);
  const revalidateThrottleRef = useRef<number>(0);
  const presenceRevalidateTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const attemptedAutoJoinRef = useRef<boolean>(false);
  const [presentUserIds, setPresentUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = supabaseRef.current;
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // SWR fetcher for participants
  const fetchParticipants = async () => {
    try {
      const supabase = supabaseRef.current;
      const { data: participantRows, error } = await supabase
        .from("trading_room_participants")
        .select(
          "user_id, left_at, users(id, first_name, last_name, avatar_url, role, status)"
        )
        .eq("room_id", roomId)
        .is("left_at", null);

      if (error) {
        console.error("Error fetching participants:", error);
        return [];
      }

      if (!participantRows) {
        return [];
      }

      // Map joined user info
      const mapped = (participantRows as unknown as JoinedParticipantRow[]).map(
        (row) => {
          const user = row.users;
          return {
            id: user.id,
            name:
              [user.first_name, user.last_name].filter(Boolean).join(" ") ||
              "-",
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

      // no-op
      return mapped;
    } catch (error) {
      console.error("Error in fetchParticipants:", error);
      return [];
    }
  };

  const { data: participants = [], isLoading } = useSWR(
    ["participants", roomId],
    fetchParticipants,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // Reduced from default
      keepPreviousData: true,
      fallbackData: [], // Prevent empty state
    }
  );

  // Derive the list actually shown, applying presence filtering like the UI
  const visibleParticipants = useMemo(() => {
    const list = (participants as Participant[]) || [];
    // If presence hasn't synced yet (first 3 seconds), show all participants
    // This prevents the list from being empty while presence is initializing
    if (presentUserIds.size === 0) return list;
    return list.filter((p) => presentUserIds.has(p.id));
  }, [participants, presentUserIds]);

  // Fallback: if presence fails to sync after 5 seconds, show all participants
  useEffect(() => {
    if (currentUserId && roomId && participants.length > 0) {
      const timer = setTimeout(() => {
        if (presentUserIds.size === 0) {
          // Force a re-render by updating a dummy state
          setPresentUserIds(new Set(participants.map((p) => p.id)));
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [currentUserId, roomId, participants, presentUserIds.size]);

  // Presence subscription to track live users in the room
  useEffect(() => {
    const supabase = supabaseRef.current;
    // Only attempt presence when we know the user
    if (!currentUserId || !roomId) return;

    const channel = supabase.channel(`room-presence-${roomId}`, {
      config: {
        presence: { key: currentUserId },
      },
    });

    const handleSync = () => {
      try {
        const state = channel.presenceState() as Record<string, unknown[]>;
        const ids = new Set<string>(Object.keys(state));
        setPresentUserIds(ids);

        // Debounced revalidation to align DB list with presence immediately
        if (presenceRevalidateTimerRef.current) {
          clearTimeout(presenceRevalidateTimerRef.current);
        }
        presenceRevalidateTimerRef.current = setTimeout(() => {
          mutate(["participants", roomId], undefined, { revalidate: true });
        }, 300);
      } catch (e) {
        console.error("Failed to read presence state:", e);
      }
    };

    channel.on("presence", { event: "sync" }, handleSync);

    // Subscribe and then track this client's presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({
            user_id: currentUserId,
            room_id: roomId,
            joined_at: new Date().toISOString(),
          });
          // Ensure initial state is synced with DB
          mutate(["participants", roomId], undefined, { revalidate: true });
        } catch (e) {
          console.error("Failed to start presence tracking:", e);
        }
      }
    });

    presenceChannelRef.current = channel;

    return () => {
      try {
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
        }
      } catch (e) {
        console.error("Failed to cleanup presence channel:", e);
      }
      setPresentUserIds(new Set());
    };
  }, [currentUserId, roomId]);

  // Aggressive refresh on tab visibility/online regain
  useEffect(() => {
    const handleWake = async () => {
      try {
        // Rehydrate presence from current channel state
        const ch = presenceChannelRef.current;
        if (ch) {
          try {
            const state = ch.presenceState() as Record<string, unknown[]>;
            setPresentUserIds(new Set<string>(Object.keys(state)));
            // retrack to refresh presence TTL
            if (currentUserId) {
              await ch.track({
                user_id: currentUserId,
                room_id: roomId,
                ping_at: Date.now(),
              });
            }
          } catch {}
        }
      } finally {
        // Force DB refresh
        mutate(["participants", roomId], undefined, { revalidate: true });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") handleWake();
    };
    const onOnline = () => handleWake();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [currentUserId, roomId]);

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
          // Throttle revalidation to at most once per 1500ms
          const now = Date.now();
          if (now - revalidateThrottleRef.current < 1500) {
            return;
          }
          revalidateThrottleRef.current = now;
          await mutate(["participants", roomId], undefined, {
            revalidate: true,
          });
        }
      )
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, [roomId]);

  // Auto-join host if they're not in the participants list
  useEffect(() => {
    if (currentUserId && currentUserId === hostId && participants.length > 0) {
      const isHostInList = participants.some((p) => p.id === currentUserId);
      if (!isHostInList) {
        console.log("Host not in participants list, auto-joining...");
        if (!attemptedAutoJoinRef.current) {
          attemptedAutoJoinRef.current = true;
          handleJoinRoom();
        }
      }
    }
  }, [currentUserId, hostId, participants, roomId]);

  const handleJoinRoom = async () => {
    if (!currentUserId) {
      toast.error(t("errors.pleaseLogin"), {
        description: t("errors.mustBeLoggedIn"),
      });
      return;
    }

    console.log("Joining room as:", currentUserId);

    // Get current user info for optimistic update
    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error(t("errors.userSessionNotFound"));
      return;
    }

    // Get user profile for optimistic update
    const { data: userProfile } = await supabase
      .from("users")
      .select("first_name, last_name, avatar_url")
      .eq("id", currentUserId)
      .single();

    const userName = userProfile
      ? [userProfile.first_name, userProfile.last_name]
          .filter(Boolean)
          .join(" ") || t("labels.you")
      : t("labels.you");

    // Optimistic UI: add current user to the list instantly
    mutate(
      ["participants", roomId],
      (current: Participant[] = []) => {
        // Don't add if already exists
        if (current.some((p) => p.id === currentUserId)) return current;

        console.log("Adding user optimistically:", userName);
        return [
          ...current,
          {
            id: currentUserId,
            name: userName,
            avatar: userProfile?.avatar_url || "",
            isOnline: true,
            role: currentUserId === hostId ? "host" : "participant",
            pending: true,
          },
        ];
      },
      false // Don't revalidate immediately
    );

    try {
      // Insert to Supabase
      const { error } = await supabase
        .from("trading_room_participants")
        .insert({
          room_id: roomId,
          user_id: currentUserId,
        });

      if (error) {
        console.error("Error joining room:", error);

        // Handle duplicate key constraint gracefully
        if (error.code === "23505") {
          console.log(
            "User already in room, updating UI to reflect current state"
          );
          // Don't show error for duplicate - just revalidate to get current state
          mutate(["participants", roomId], undefined, { revalidate: true });
          toast.success(t("success.alreadyInRoom"));
          return;
        }

        // Roll back optimistic update if error
        mutate(["participants", roomId], undefined, { revalidate: true });
        toast.error(t("errors.failedToJoinRoom", { message: error.message }));
        return;
      }

      console.log("Successfully joined room");

      // Success - update the pending state to confirmed
      mutate(
        ["participants", roomId],
        (current: Participant[] = []) => {
          return current.map((p) =>
            p.id === currentUserId ? { ...p, pending: false } : p
          );
        },
        false
      );

      toast.success(t("success.joinedRoom"));

      // Revalidate after a short delay to ensure consistency
      setTimeout(() => {
        mutate(["participants", roomId], undefined, { revalidate: true });
      }, 500); // Reduced from 1000ms to 500ms
    } catch (error) {
      console.error("Error joining room:", error);
      // Roll back optimistic update if error
      mutate(["participants", roomId], undefined, { revalidate: true });
      toast.error(t("errors.failedToJoinRoomGeneric"));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background sticky top-0 z-10 select-none">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t("title")}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {visibleParticipants.length}
        </span>
      </div>
      <ScrollArea className="flex-1 overflow-y-auto select-none">
        <div className="p-2">
          {isLoading && (participants?.length ?? 0) === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t("loading")}
            </div>
          ) : visibleParticipants.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t("empty.noParticipants")}
            </div>
          ) : (
            visibleParticipants.map((participant) => (
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
                  </span>
                  <div className="text-xs text-muted-foreground capitalize">
                    {participant.id === hostId ? (
                      <div className="flex items-center gap-0">
                        <span>{t("roles.host")}</span>
                        <Crown className="inline-block ml-1 h-3 w-3 text-amber-400 align-text-bottom" />
                      </div>
                    ) : (
                      t("roles.participant")
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
                {t("actions.joinRoom")}
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
