"use client";

import { StreamChat } from "@/components/test-components/test-stream/stream-chat";
import { StreamDashboard } from "@/components/test-components/test-stream/stream-dashboard";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StreamPageClientProps {
  roomId: string;
}

interface StreamData {
  streamId?: string;
  streamKey?: string;
  rtmpUrl?: string;
  playbackId?: string;
  latencyMode?: string;
  reconnectWindow?: number;
  enableDvr?: boolean;
  unlistReplay?: boolean;
  status?: string;
  startedAt?: string;
  customThumbnailUrl?: string;
}

interface RoomData {
  creator_id: string;
  room_status: string;
}

export function StreamPageClient({ roomId }: StreamPageClientProps) {
  const tDash = useTranslations("stream.dashboard");
  const t = useTranslations("room");
  const [popoutMode, setPopoutMode] = useState<null | boolean>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setPopoutMode(Boolean(sp.get("is_popout")));
  }, []);
  // Only the room creator can access this page. Others are redirected.
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          window.location.assign("/trading");
          return;
        }
        const { data: room } = await supabase
          .from("trading_rooms")
          .select("creator_id, room_status")
          .eq("id", roomId)
          .single();
        if (!room || room.creator_id !== user.id) {
          window.location.assign("/trading");
          return;
        }
        setRoomData(room);
        setIsAuthorized(true);
      } catch {
        window.location.assign("/trading");
      }
    };
    checkAuth();
  }, [roomId]);
  const [streamData, setStreamData] = useState<StreamData | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedRef = useRef(false);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (popoutMode === true) return; // skip fetching in popout
    if (isAuthorized !== true) return; // wait until auth check passes
    if (hasCheckedRef.current) return;

    const fetchOrCreateStream = async () => {
      hasCheckedRef.current = true;

      try {
        const response = await fetch(`/api/streams?roomId=${roomId}`);
        const data = await response.json();

        if (data.streams && data.streams.length > 0) {
          const stream = data.streams[0];
          setStreamData({
            streamId: stream.stream_id,
            streamKey: stream.stream_key,
            rtmpUrl: stream.rtmp_url,
            playbackId: stream.playback_id,
            latencyMode: stream.latency_mode,
            reconnectWindow: stream.reconnect_window,
            enableDvr: stream.enable_dvr,
            unlistReplay: stream.unlist_replay,
            status: stream.status,
            startedAt: stream.started_at,
            customThumbnailUrl: stream.custom_thumbnail_url,
          });
          setIsLoading(false);
        }

        if (data.autoCreate && !hasNotifiedRef.current) {
          const createResponse = await fetch("/api/streams/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId,
              latency_mode: "low",
              reconnect_window: 60,
              enable_dvr: true,
              unlist_replay: false,
            }),
          });

          const createdData = await createResponse.json();

          if (createResponse.ok) {
            hasNotifiedRef.current = true;
            toast.success(tDash("toasts.credentialsGenerated"));
            setStreamData({
              streamId: createdData.streamId,
              streamKey: createdData.streamKey,
              rtmpUrl: createdData.rtmpUrl,
              playbackId: createdData.playbackId,
              latencyMode: createdData.latencyMode,
              reconnectWindow: createdData.reconnectWindow,
              enableDvr: createdData.enableDvr ?? true,
              unlistReplay: createdData.unlistReplay ?? false,
              status: createdData.status,
              startedAt: createdData.startedAt,
              customThumbnailUrl: createdData.customThumbnailUrl,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching/creating stream:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrCreateStream();
  }, [roomId, popoutMode, isAuthorized]);

  useEffect(() => {
    if (popoutMode === true) return; // skip realtime in popout
    if (!streamData?.playbackId) return;
    if (isAuthorized !== true) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`stream-updates-${roomId}`)
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
          setStreamData((prev) => ({
            ...prev,
            streamId: updatedStream.stream_id,
            streamKey: updatedStream.stream_key,
            rtmpUrl: updatedStream.rtmp_url,
            latencyMode: updatedStream.latency_mode,
            reconnectWindow: updatedStream.reconnect_window,
            enableDvr: updatedStream.enable_dvr,
            unlistReplay: updatedStream.unlist_replay,
            status: updatedStream.status,
            startedAt: updatedStream.started_at,
            customThumbnailUrl: updatedStream.custom_thumbnail_url,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, streamData?.playbackId, popoutMode, isAuthorized]);

  if (popoutMode === true) {
    return (
      <div className="flex h-full w-full p-0">
        <StreamChat />
      </div>
    );
  }

  if (isAuthorized !== true || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">{tDash("loading")}</div>
      </div>
    );
  }

  if (roomData?.room_status === "ended") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-3">
            {t("ended.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {t("ended.description")}
          </p>
          <Button asChild>
            <Link href="/trading">{t("ended.goBackToTrading")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full gap-2 p-4 overflow-y-auto scrollbar-none flex-col lg:flex-row">
      <div className="flex-1 min-w-0">
        <StreamDashboard streamData={streamData} roomId={roomId} />
      </div>
      <div className="w-full lg:w-[420px] shrink-0 lg:h-full">
        <StreamChat />
      </div>
    </div>
  );
}
