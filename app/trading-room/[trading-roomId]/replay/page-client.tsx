"use client";

import { useEffect, useMemo, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";

interface ReplayPageClientProps {
  roomId: string;
}

export function ReplayPageClient({ roomId }: ReplayPageClientProps) {
  const [streamId, setStreamId] = useState<string | null>(null);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    const load = async () => {
      try {
        const sres = await fetch(`/api/streams?roomId=${roomId}`, {
          headers: { "Cache-Control": "no-store" },
        });
        if (!sres.ok) {
          setIsLoading(false);
          return;
        }
        const sjson = await sres.json();
        const s = Array.isArray(sjson?.streams) ? sjson.streams[0] : null;
        const sid = s?.stream_id as string | undefined;
        if (!sid) {
          setIsLoading(false);
          return;
        }
        if (aborted) return;
        setStreamId(sid);

        const rres = await fetch(`/api/streams/${sid}/replay`, {
          headers: { "Cache-Control": "no-store" },
        });
        if (!rres.ok) {
          setIsLoading(false);
          return;
        }
        const rjson = await rres.json();
        if (aborted) return;
        setPlaybackId(rjson?.playbackId || null);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    };
    load();
    return () => {
      aborted = true;
    };
  }, [roomId]);

  const title = useMemo(() => "Recorded Stream", []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading replay...</p>
        </div>
      </div>
    );
  }

  if (!playbackId) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <div className="text-center text-muted-foreground">
          Replay not available for this room yet.
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background p-4">
      <div className="w-full h-full border border-border rounded-md overflow-hidden">
        <MuxPlayer
          streamType="on-demand"
          playbackId={playbackId}
          metadata={{ video_title: title, video_id: streamId || undefined }}
          autoPlay
          playsInline
          envKey={process.env.NEXT_PUBLIC_MUX_DATA_ENV_KEY}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}
