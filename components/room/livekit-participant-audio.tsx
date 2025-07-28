import { createClient } from "@/lib/supabase/client";
import {
  Room as LiveKitClientRoom,
  RemoteParticipant,
  Track,
  TrackPublication,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";

interface LivektParticipantAudioProps {
  roomId: string;
  hostId: string;
}

export function LivektParticipantAudio({
  roomId,
  hostId,
}: LivektParticipantAudioProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false); // For UI
  const roomRef = useRef<LiveKitClientRoom | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // State to track if the user has tried to unlock audio
  const [, setUnlockAttempted] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  // Fetch LiveKit token for participant
  useEffect(() => {
    if (roomId && currentUserId && currentUserId !== hostId) {
      fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          roomId,
          role: "participant",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLivekitToken(data.token);
        });
    }
  }, [roomId, currentUserId, hostId]);

  // Connect to LiveKit and play remote audio
  useEffect(() => {
    if (!roomId || !livekitToken || !currentUserId || currentUserId === hostId)
      return;
    let room: LiveKitClientRoom | null = null;
    import("livekit-client").then(async ({ Room, RoomEvent }) => {
      room = new Room();
      roomRef.current = room;
      await room.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_API_URL!,
        livekitToken
      );
      // Listen for remote audio tracks
      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: Track,
          publication: TrackPublication,
          participant: RemoteParticipant
        ) => {
          if (track.kind === "audio" && audioRef.current) {
            // Detach and re-attach to force playback after unlock
            track.detach();
            track.attach(audioRef.current);
          }
        }
      );
      room.on(
        RoomEvent.TrackUnsubscribed,
        (
          track: Track,
          publication: TrackPublication,
          participant: RemoteParticipant
        ) => {
          if (track.kind === "audio" && audioRef.current) {
            track.detach(audioRef.current);
          }
        }
      );
      // Listen for audio playback status changes (LiveKit standard)
      const handleAudioStatus = () => {
        if (!room) return;
        if (!room.canPlaybackAudio) {
          setAudioBlocked(true);
        } else {
          setAudioBlocked(false);
          // Detach and re-attach all remote audio tracks (for late joiners)
          const remoteParticipants = room.remoteParticipants;
          if (remoteParticipants && remoteParticipants.size > 0) {
            remoteParticipants.forEach((participant: RemoteParticipant) => {
              const audioTracks = participant
                .getTrackPublications()
                .filter(
                  (publication: TrackPublication) =>
                    publication.kind === "audio" &&
                    publication.isSubscribed &&
                    publication.track
                );
              audioTracks.forEach((publication: TrackPublication) => {
                if (publication.track && audioRef.current) {
                  publication.track.detach();
                  publication.track.attach(audioRef.current);
                }
              });
            });
          }
        }
      };
      room.on(RoomEvent.AudioPlaybackStatusChanged, handleAudioStatus);
      // Initial check
      handleAudioStatus();
    });
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomId, livekitToken, currentUserId, hostId]);

  // Handler for user gesture to unlock audio
  const handleStartAudio = () => {
    setUnlockAttempted(true);
    const room = roomRef.current;
    if (room) {
      room.startAudio().then(() => {
        setAudioBlocked(false);
        // Detach and re-attach all remote audio tracks (fixes late join/refresh bug)
        const remoteParticipants = room.remoteParticipants;
        if (remoteParticipants && remoteParticipants.size > 0) {
          remoteParticipants.forEach((participant: RemoteParticipant) => {
            const audioTracks = participant
              .getTrackPublications()
              .filter(
                (publication: TrackPublication) =>
                  publication.kind === "audio" &&
                  publication.isSubscribed &&
                  publication.track
              );
            audioTracks.forEach((publication: TrackPublication) => {
              if (publication.track && audioRef.current) {
                publication.track.detach();
                publication.track.attach(audioRef.current);
              }
            });
          });
        }
      });
    }
  };

  // Render the audio element and unlock button if needed
  return (
    <>
      <audio
        ref={audioRef}
        autoPlay
        controls
        className="fixed bottom-6 left-0 right-0 z-[1000] mx-auto hidden"
      />
      {audioBlocked && (
        <div className="fixed bottom-24 left-0 right-0 z-[1000] flex justify-center">
          <button
            onClick={handleStartAudio}
            className="px-6 py-3 text-base rounded-lg bg-blue-600 text-white border-none shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 cursor-pointer"
          >
            Click to enable audio
          </button>
        </div>
      )}
    </>
  );
}
