import { createClient } from "@/lib/supabase/client";
import {
  Room as LiveKitClientRoom,
  createLocalAudioTrack,
  LocalAudioTrack,
  RoomEvent,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";

export function useLivektHostAudio({
  roomType,
  hostId,
  roomId,
}: {
  roomType: "regular" | "voice";
  hostId: string;
  roomId: string;
}) {
  const [isMicOn, setIsMicOn] = useState(false); // default to muted
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [roomConnected, setRoomConnected] = useState(false);
  const roomRef = useRef<LiveKitClientRoom | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
      console.log("[HostAudio] Current user ID:", data?.user?.id);
    });
  }, []);

  // Fetch LiveKit token for host in voice room
  useEffect(() => {
    if (
      roomType === "voice" &&
      currentUserId &&
      currentUserId === hostId &&
      roomId
    ) {
      console.log("[HostAudio] Fetching LiveKit token for host", {
        currentUserId,
        roomId,
      });
      fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          roomId,
          role: "host",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLivekitToken(data.token);
          console.log("[HostAudio] Received LiveKit token:", data.token);
        })
        .catch((err) => {
          console.error("[HostAudio] Error fetching LiveKit token:", err);
        });
    }
  }, [roomType, currentUserId, hostId, roomId]);

  // Connect to LiveKit room as host
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (
      roomType === "voice" &&
      currentUserId === hostId &&
      livekitToken &&
      roomId
    ) {
      import("livekit-client").then(async ({ Room, RoomEvent }) => {
        const room = new Room();
        roomRef.current = room;
        setRoomConnected(false);
        console.log("[HostAudio] Connecting to LiveKit room", roomId);
        // Log all room events for debugging
        Object.values(RoomEvent).forEach((event) => {
          room.on(event, (...args: any[]) => {
            console.log(`[HostAudio] LiveKit RoomEvent: ${event}`, ...args);
          });
        });
        room.on(RoomEvent.Connected, () => {
          setRoomConnected(true);
          console.log("[HostAudio] Connected to LiveKit room");
        });
        room.on(RoomEvent.Disconnected, () => {
          setRoomConnected(false);
          console.log("[HostAudio] Disconnected from LiveKit room");
          // Clean up audio track on disconnect
          if (audioTrackRef.current) {
            audioTrackRef.current.stop();
            audioTrackRef.current = null;
            console.log("[HostAudio] Cleaned up audio track on disconnect");
          }
        });
        try {
          await room.connect(
            process.env.NEXT_PUBLIC_LIVEKIT_API_URL!,
            livekitToken
          );
        } catch (err) {
          console.error("[HostAudio] Error connecting to LiveKit room:", err);
        }
      });
      cleanup = () => {
        // Unpublish and stop audio track on cleanup
        if (audioTrackRef.current && roomRef.current) {
          roomRef.current.localParticipant.unpublishTrack(
            audioTrackRef.current
          );
          audioTrackRef.current.stop();
          audioTrackRef.current = null;
          console.log("[HostAudio] Cleaned up audio track on cleanup");
        }
        roomRef.current?.disconnect();
        roomRef.current = null;
        setRoomConnected(false);
        console.log("[HostAudio] Room cleanup complete");
      };
    }
    return cleanup;
  }, [roomType, currentUserId, hostId, livekitToken, roomId]);

  // Toggle mic (publish/unpublish local audio track)
  const toggleMic = async () => {
    if (!roomConnected || !roomRef.current) {
      console.warn("[HostAudio] toggleMic called but room not connected");
      return;
    }
    if (!isMicOn) {
      // Turn mic ON: create and publish audio track
      try {
        console.log("[HostAudio] Creating and publishing local audio track");
        const localAudioTrack = await createLocalAudioTrack();
        await roomRef.current.localParticipant.publishTrack(localAudioTrack);
        audioTrackRef.current = localAudioTrack;
        setIsMicOn(true);
        console.log(
          "[HostAudio] Mic ON: published audio track",
          localAudioTrack
        );
      } catch (err) {
        console.error("[HostAudio] Error publishing audio track:", err);
      }
    } else {
      // Turn mic OFF: unpublish and stop audio track
      if (audioTrackRef.current) {
        try {
          roomRef.current.localParticipant.unpublishTrack(
            audioTrackRef.current
          );
          audioTrackRef.current.stop();
          console.log(
            "[HostAudio] Mic OFF: unpublished and stopped audio track"
          );
        } catch (err) {
          console.error("[HostAudio] Error unpublishing audio track:", err);
        }
        audioTrackRef.current = null;
      }
      setIsMicOn(false);
    }
  };

  return { isMicOn, setIsMicOn, toggleMic, currentUserId, roomConnected };
}
