"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface StreamData {
  streamKey?: string;
  rtmpUrl?: string;
  playbackId?: string;
  [key: string]: unknown;
}

interface StreamAutoCreateProps {
  roomId: string;
  onStreamCreated: (streamData: StreamData) => void;
}

export function StreamAutoCreate({
  roomId,
  onStreamCreated,
}: StreamAutoCreateProps) {
  const hasCheckedRef = useRef(false);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;

    const checkAndCreateStream = async () => {
      hasCheckedRef.current = true;

      try {
        const response = await fetch(`/api/streams?roomId=${roomId}`);
        const data = await response.json();

        if (data.streams && data.streams.length > 0) {
          return;
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

          const streamData = await createResponse.json();

          if (createResponse.ok) {
            hasNotifiedRef.current = true;
            toast.success("Stream credentials generated successfully!");
            onStreamCreated(streamData);
          } else if (!createResponse.ok) {
            toast.error(streamData.error || "Failed to generate stream");
          }
        }
      } catch (error) {
        console.error("Error auto-creating stream:", error);
      }
    };

    checkAndCreateStream();
  }, [roomId]);

  return null;
}
