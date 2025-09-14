import { createClient } from "@/lib/supabase/client";
import { suppressLiveKitErrorsGlobally } from "@/lib/livekit-error-handler";
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
  const [audioContextUnlocked, setAudioContextUnlocked] = useState(false);
  const connectionAttemptRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  // Handle AudioContext unlock on user gesture
  useEffect(() => {
    const handleUserGesture = async () => {
      if (audioContextUnlocked) return;

      try {
        // Create and resume AudioContext to unlock audio
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext: typeof AudioContext;
            }
          ).webkitAudioContext;
        const audioContext = new AudioContextClass();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        setAudioContextUnlocked(true);
        console.log("AudioContext unlocked by user gesture");
      } catch (error) {
        console.warn("Failed to unlock AudioContext:", error);
      }
    };

    // Add event listeners for user gestures
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, handleUserGesture, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserGesture);
      });
    };
  }, [audioContextUnlocked]);

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

    // Prevent multiple simultaneous connection attempts
    if (connectionAttemptRef.current) {
      console.log("Audio connection attempt already in progress, skipping...");
      return;
    }

    connectionAttemptRef.current = true;

    // Clean up existing connection
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    // Suppress LiveKit data channel errors in console
    const cleanupConsole = suppressLiveKitErrorsGlobally();

    let room: LiveKitClientRoom | null = null;
    import("livekit-client").then(async ({ Room, RoomEvent }) => {
      try {
        room = new Room();
        roomRef.current = room;

        // Add connection error handling
        room.on(RoomEvent.Disconnected, (reason) => {
          console.log("LiveKit disconnected:", reason);
        });

        room.on(RoomEvent.Reconnecting, () => {
          console.log("LiveKit reconnecting...");
        });

        room.on(RoomEvent.Reconnected, () => {
          console.log("LiveKit reconnected");
        });

        // Handle data channel errors gracefully
        room.on(RoomEvent.DataReceived, (payload) => {
          // Handle data channel messages if needed
          console.log("LiveKit data received:", payload);
        });

        // Add error handling for data channel issues
        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          console.log("LiveKit connection state changed:", state);
        });

        await room.connect(
          process.env.NEXT_PUBLIC_LIVEKIT_API_URL!,
          livekitToken
        );

        console.log("Successfully connected to LiveKit room");
        connectionAttemptRef.current = false;
        retryCountRef.current = 0;
      } catch (error) {
        console.error("Failed to connect to LiveKit:", error);
        connectionAttemptRef.current = false;

        // Implement exponential backoff retry
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s

          console.log(
            `Retrying audio connection in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`
          );

          retryTimeoutRef.current = setTimeout(() => {
            // Trigger reconnection by updating a dependency
            setLivekitToken((prev) => prev); // This will trigger the useEffect again
          }, delay);
        } else {
          console.error("Max retry attempts reached for audio connection");
          retryCountRef.current = 0;
        }

        return; // Exit early if connection failed
      }

      // Only proceed if room connection was successful
      if (!room) return;

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
      // Restore original console.error
      cleanupConsole();

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }

      connectionAttemptRef.current = false;
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
