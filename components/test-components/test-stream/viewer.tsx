"use client";

import { useLiveViewers } from "@/hooks/use-live-viewers";
import { useRoomParticipant } from "@/hooks/use-room-participant";
import { createClient } from "@/lib/supabase/client";
import "@mux/mux-active-viewer-count";
import MuxPlayer from "@mux/mux-player-react";
import { EyeIcon, VideoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { StreamChat } from "./stream-chat";

interface StreamData {
  streamId?: string;
  playbackId?: string;
  status?: string;
}

interface ViewerProps {
  roomId: string;
}

export function Viewer({ roomId }: ViewerProps) {
  const tInactive = useTranslations("stream.viewer.inactive");
  const [streamData, setStreamData] = useState<StreamData | undefined>();
  const [roomName, setRoomName] = useState<string | null>(null);
  const [roomDescription, setRoomDescription] = useState<string | null>(null);
  const [roomTags, setRoomTags] = useState<string[]>([]);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [presenceCount, setPresenceCount] = useState<number>(0);
  const hasCheckedRef = useRef(false);
  const supabase = useRef(createClient());
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Ensure viewer is added as participant to read messages
  useEffect(() => {
    supabase.current.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser({ id: data.user.id });
      }
    });
  }, []);

  const { joinRoom } = useRoomParticipant(roomId, currentUser);

  useEffect(() => {
    if (currentUser && roomId) {
      joinRoom().catch((error) => {
        console.error("Error joining room as participant:", error);
      });
    }
  }, [currentUser, roomId, joinRoom]);

  // console.log("THE MUX ENV KEY IS:", process.env.NEXT_PUBLIC_MUX_DATA_ENV_KEY);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const fetchStream = async () => {
      try {
        const response = await fetch(`/api/streams?roomId=${roomId}`);

        if (!response.ok) {
          console.error(
            "Failed to fetch stream:",
            response.status,
            response.statusText
          );
          setStreamData(undefined);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (data.streams && data.streams.length > 0) {
          const stream = data.streams[0];
          setStreamData({
            streamId: stream.stream_id,
            playbackId: stream.playback_id,
            status: stream.status,
          });
        } else {
          setStreamData(undefined);
        }
      } catch (error) {
        console.error("Error fetching stream:", error);
        setStreamData(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();

    const fetchRoomName = async () => {
      try {
        const response = await fetch(`/api/trading-rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setRoomName(data.name || null);
          setRoomDescription(data.description || null);
          setRoomTags(Array.isArray(data.tags) ? data.tags : []);
        }
      } catch (error) {
        console.error("Error fetching room name:", error);
      }
    };

    fetchRoomName();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.current
      .channel(`viewer-stream-updates-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_streams",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updatedStream = payload.new;
          setStreamData((prev) => {
            if (
              prev?.streamId === updatedStream.stream_id &&
              prev?.playbackId === updatedStream.playback_id &&
              prev?.status === updatedStream.status
            ) {
              return prev;
            }
            return {
              ...prev,
              streamId: updatedStream.stream_id || prev?.streamId,
              playbackId: updatedStream.playback_id || prev?.playbackId,
              status: updatedStream.status || prev?.status,
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_streams",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newStream = payload.new;
          setStreamData((prev) => {
            if (
              prev?.streamId === newStream.stream_id &&
              prev?.playbackId === newStream.playback_id &&
              prev?.status === newStream.status
            ) {
              return prev;
            }
            return {
              streamId: newStream.stream_id,
              playbackId: newStream.playback_id,
              status: newStream.status,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [roomId]);

  // Supabase Realtime presence fallback so viewers see a number even if Mux analytics is blocked
  useEffect(() => {
    let channel: ReturnType<typeof supabase.current.channel> | null = null;
    let tracked = false;
    (async () => {
      try {
        const { data } = await supabase.current.auth.getUser();
        const uid =
          data?.user?.id || `anon-${Math.random().toString(36).slice(2, 8)}`;
        channel = supabase.current.channel(`room-presence-${roomId}`, {
          config: { presence: { key: uid } },
        });

        channel
          .on("presence", { event: "sync" }, () => {
            try {
              const state = channel?.presenceState() || {};
              const total = Object.values(state).reduce(
                (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
                0
              );
              setPresenceCount(total);
            } catch {}
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && !tracked) {
              tracked = true;
              await channel!.track({ joined_at: new Date().toISOString() });
            }
          });
      } catch {}
    })();

    return () => {
      if (channel) supabase.current.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      const errorString = String(firstArg || "");

      const isNonFatalHlsError =
        errorString.includes("getErrorFromHlsErrorData") ||
        errorString.includes("bufferStalledError") ||
        (typeof firstArg === "object" &&
          firstArg !== null &&
          "details" in firstArg &&
          (firstArg as { details?: string; fatal?: boolean }).details ===
            "bufferStalledError" &&
          (firstArg as { fatal?: boolean }).fatal === false);

      const isReactMaxDepth = errorString.includes(
        "Maximum update depth exceeded"
      );

      if (isNonFatalHlsError || isReactMaxDepth) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const hasPlaybackId = useMemo(
    () => !!streamData?.playbackId,
    [streamData?.playbackId]
  );
  const isActive = useMemo(
    () => streamData?.status === "active",
    [streamData?.status]
  );

  const inactiveMessage = useMemo(() => {
    const status = streamData?.status;
    if (status === "ended" || status === "stopped" || status === "complete") {
      return {
        title: tInactive("endedTitle"),
        description: tInactive("endedDesc"),
      };
    }
    return {
      title: tInactive("offlineTitle"),
      description: tInactive("offlineDesc"),
    };
  }, [streamData?.status, tInactive]);

  const muxPlayerMetadata = useMemo(
    () => ({
      video_title: roomName || "Live Stream",
      video_id: streamData?.streamId,
    }),
    [streamData?.streamId, roomName]
  );

  const isOnline = useMemo(
    () => streamData?.status === "active",
    [streamData?.status]
  );

  const { viewers } = useLiveViewers(
    streamData?.streamId,
    isOnline,
    streamData?.playbackId,
    { videoOnly: true }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-background gap-1 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col w-full min-w-0 lg:min-h-0">
        <div className="flex-1 w-full border border-border bg-background rounded-none overflow-hidden relative aspect-video lg:aspect-auto">
          {hasPlaybackId && streamData?.playbackId && isActive ? (
            <>
              <MuxPlayer
                streamType="live"
                playbackId={streamData.playbackId}
                metadata={muxPlayerMetadata}
                preferPlayback="mse"
                autoPlay
                playsInline
                envKey={process.env.NEXT_PUBLIC_MUX_DATA_ENV_KEY}
                style={{ height: "100%", width: "100%" }}
              />
              {/* @ts-expect-error - mux-active-viewer-count is a custom web component */}
              <mux-active-viewer-count
                playback-id={streamData.playbackId}
                style={{ display: "none" }}
              />
            </>
          ) : (
            <div className="h-full w-full grid place-content-center text-muted-foreground bg-muted/20">
              <div className="flex flex-col items-center gap-3 px-4">
                <VideoIcon className="h-12 w-12" />
                <div className="text-center space-y-1">
                  <p className="text-base font-medium">
                    {inactiveMessage.title}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {inactiveMessage.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Meta section styled similar to YouTube */}
        <div className="mt-1 p-2 bg-background border">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold leading-7 text-foreground truncate">
              {roomName || "Live Stream"}
            </h1>
            {/* Live/Watching pill */}
            {isOnline && streamData?.playbackId && (
              <div className="shrink-0 inline-flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-md bg-red-500 opacity-75 animate-ping"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-md bg-red-500"></span>
                  </span>
                  <EyeIcon className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-semibold text-red-500 tabular-nums">
                    {Math.max(viewers, presenceCount).toLocaleString()} watching
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {roomTags?.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {roomTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md border border-border bg-muted/40 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Description (collapsible like YouTube) */}
          {roomDescription ? (
            <div className="mt-3">
              <div className={showFullDesc ? "" : "line-clamp-2"}>
                <p className="text-sm text-muted-foreground leading-6 whitespace-pre-wrap break-words">
                  {roomDescription}
                </p>
              </div>
              <button
                type="button"
                className="mt-1 text-xs text-primary hover:underline"
                onClick={() => setShowFullDesc((v) => !v)}
              >
                {showFullDesc ? "Show less" : "Show more"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <StreamChat roomId={roomId} showDonation disablePopout />
    </div>
  );
}
