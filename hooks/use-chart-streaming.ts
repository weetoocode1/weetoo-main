"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Room as LiveKitClientRoom,
  LocalVideoTrack,
  RemoteVideoTrack,
  Track,
  TrackPublication,
  RemoteParticipant,
  RoomEvent,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

type ViewerQuality = "low" | "medium" | "high";

type HostPreset = "1080p" | "720p" | "540p";

interface ChartStreamingState {
  isStreaming: boolean;
  isHostStreaming: boolean;
  hostVideoTrack: RemoteVideoTrack | null;
  hostVideoPublication: TrackPublication | null;
  localVideoTrack: LocalVideoTrack | null;
  room: LiveKitClientRoom | null;
  error: string | null;
  viewerQuality: ViewerQuality;
  hostPreset: HostPreset; // selected by host (self)
  hostMaxPreset: HostPreset; // last broadcast by host (participants use)
  qualityStats: {
    codec?: string;
    layer?: string;
    bitrate?: number;
    resolution?: string;
    frameRate?: number;
  };
  qualityMonitor?: NodeJS.Timeout;
  participantQualityMonitor?: NodeJS.Timeout;
}

export function useChartStreaming(roomId: string, hostId: string) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [state, setState] = useState<ChartStreamingState>({
    isStreaming: false,
    isHostStreaming: false,
    hostVideoTrack: null,
    hostVideoPublication: null,
    localVideoTrack: null,
    room: null,
    error: null,
    viewerQuality: "high",
    hostPreset: "1080p",
    hostMaxPreset: "1080p",
    qualityStats: {},
  });

  const roomRef = useRef<LiveKitClientRoom | null>(null);
  const isHost = currentUserId === hostId;
  const localTrackRef = useRef<LocalVideoTrack | null>(null);
  const subscriptionInProgressRef = useRef<boolean>(false);
  const aggressiveCheckRef = useRef<NodeJS.Timeout | null>(null);
  const periodicCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  // Warn host if their tab is backgrounded (browsers throttle updates)
  useEffect(() => {
    if (!isHost) return;
    const onVis = () => {
      if (document.hidden) {
        setState((p) => ({
          ...p,
          error:
            "Your tab is in background. Browsers may throttle updates; prefer sharing a Window and keep this tab focused.",
        }));
      } else {
        setState((p) => ({ ...p, error: null }));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isHost]);

  // Fetch LiveKit token for video streaming
  useEffect(() => {
    if (roomId && currentUserId) {
      fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          roomId,
          role: isHost ? "host" : "participant",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLivekitToken(data.token);
        })
        .catch(() => {
          setState((prev) => ({
            ...prev,
            error: "Failed to get LiveKit token",
          }));
        });
    }
  }, [roomId, currentUserId, isHost]);

  // Connect to LiveKit room
  useEffect(() => {
    if (!roomId || !livekitToken || !currentUserId) return;

    let room: LiveKitClientRoom | null = null;

    const connectToRoom = async () => {
      try {
        const lk: any = await import("livekit-client");
        try {
          lk.setLogLevel?.(lk.LogLevel?.error ?? 0);
        } catch (_) {}
        const RoomCtor = lk.Room as typeof LiveKitClientRoom;
        const RoomEventEnum = lk.RoomEvent as typeof RoomEvent;
        // Enable dynacast/adaptive for stability and quality
        room = new RoomCtor({
          adaptiveStream: isHost ? true : false,
          dynacast: true,
          stopLocalTrackOnUnpublish: true,
          publishDefaults: isHost
            ? {
                // Prefer VP9 for sharper screen content; SDK will fall back when unsupported
                videoCodec: "vp9",
                videoEncoding: {
                  maxBitrate: 8_000_000, // Increased for 1080p screen sharing
                  maxFramerate: 30,
                  keyFrameInterval: 2, // Keyframe every 2 seconds for better quality
                },
                // For VP9 SVC, we don't use videoSimulcastLayers - scalabilityMode handles layers
                // VP9 SVC automatically provides multiple quality layers (L3T3 = 3 spatial, 3 temporal)
              }
            : undefined,
          // @ts-ignore ensure autosubscribe for participants
          autoSubscribe: true,
        } as any);
        roomRef.current = room;

        await room.connect(
          process.env.NEXT_PUBLIC_LIVEKIT_API_URL!,
          livekitToken
        );

        setState((prev) => ({ ...prev, room, error: null }));

        const subscribeHostIfAny = (rp: RemoteParticipant) => {
          if (rp.identity !== hostId) return;

          // Prevent race conditions by checking if subscription is already in progress
          if (subscriptionInProgressRef.current) {
            console.log("🔄 Subscription already in progress, skipping...");
            return;
          }

          rp.getTrackPublications().forEach((pub: TrackPublication) => {
            if (pub.kind === "video") {
              console.log(
                `Found host video: subscribed=${
                  pub.isSubscribed
                }, track=${!!pub.track}`
              );
              if (!pub.isSubscribed) {
                console.log("🔄 Host video not subscribed, subscribing now...");
                subscriptionInProgressRef.current = true;
                try {
                  // Prefer requestSubscription API when present
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (pub as any).setSubscribed
                    ? // Some SDKs expose setSubscribed on publication
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (pub as any).setSubscribed(true)
                    : // Otherwise request subscription on the participant
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (rp as any).requestSubscription?.(pub.trackSid, true);

                  // Reset subscription flag after a delay
                  setTimeout(() => {
                    subscriptionInProgressRef.current = false;
                  }, 2000);
                } catch (e) {
                  console.warn("Failed to subscribe to host video:", e);
                  subscriptionInProgressRef.current = false;
                }
              } else if (pub.isSubscribed && pub.track) {
                // Already subscribed, update state immediately
                console.log("✅ Host video already subscribed, updating state");
                setState((prev) => ({
                  ...prev,
                  isHostStreaming: true,
                  hostVideoTrack: pub.track as RemoteVideoTrack,
                  hostVideoPublication: pub,
                }));
              }
            }
          });
        };

        // On initial join, subscribe if host is already publishing
        room.remoteParticipants.forEach((rp: RemoteParticipant) => {
          subscribeHostIfAny(rp);
        });

        // Add aggressive subscription check for participants who join before host starts streaming
        if (!isHost && room) {
          aggressiveCheckRef.current = setInterval(() => {
            const currentRoom = roomRef.current;
            if (!currentRoom) return;
            const host = currentRoom.remoteParticipants.get(hostId);
            if (host) {
              const videoPubs = host
                .getTrackPublications()
                .filter((p) => p.kind === "video");
              if (videoPubs.length > 0) {
                const hasActiveVideo = videoPubs.some(
                  (p) => p.isSubscribed && p.track && !p.track.isMuted
                );
                if (!hasActiveVideo && !subscriptionInProgressRef.current) {
                  console.log(
                    "🔄 No active video found, attempting aggressive resubscription"
                  );
                  subscribeHostIfAny(host);
                }
              }
            }
          }, 3000); // Check every 3 seconds for the first 30 seconds

          // Stop aggressive checking after 30 seconds
          setTimeout(() => {
            if (aggressiveCheckRef.current) {
              clearInterval(aggressiveCheckRef.current);
              aggressiveCheckRef.current = null;
            }
          }, 30000);
        }

        // Listen for host track publications and subscribe explicitly
        room.on(
          RoomEventEnum.TrackPublished,
          (pub: TrackPublication, participant: RemoteParticipant) => {
            if (participant.identity === hostId && pub.kind === "video") {
              console.log(
                "🎥 Host video track published - subscribing immediately"
              );
              // Force immediate subscription to new video tracks, but prevent race conditions
              if (!subscriptionInProgressRef.current) {
                setTimeout(() => {
                  subscribeHostIfAny(participant);
                }, 100);
              } else {
                console.log("🔄 Subscription already in progress, queuing...");
                setTimeout(() => {
                  subscribeHostIfAny(participant);
                }, 2000);
              }
            }
          }
        );

        // Listen for remote video tracks (host's chart stream)
        room.on(
          RoomEventEnum.TrackSubscribed,
          (
            track: Track,
            publication: TrackPublication,
            participant: RemoteParticipant
          ) => {
            if (track.kind === "video" && participant.identity === hostId) {
              console.log("🎥 Host video track subscribed for participant");

              // Reset subscription flag since we successfully subscribed
              subscriptionInProgressRef.current = false;

              // Immediately update state for instant video display
              setState((prev) => ({
                ...prev,
                isHostStreaming: true,
                hostVideoTrack: track as RemoteVideoTrack,
                hostVideoPublication: publication,
                error: null, // Clear any previous errors
              }));

              // Set high quality and priority
              try {
                const pub = publication as any;
                if (pub.setVideoQuality) {
                  pub.setVideoQuality("high");
                  console.log("✅ Set high video quality for participant");
                }
                if (pub.setPriority) {
                  pub.setPriority("high");
                  console.log("✅ Set high priority for participant");
                }
              } catch (e) {
                console.warn("Failed to set high quality for participant:", e);
              }

              // Add track event listeners for better monitoring
              track.on("muted", () => {
                console.log("🎥 Host video track muted");
              });

              track.on("unmuted", () => {
                console.log("🎥 Host video track unmuted");
              });

              track.on("ended", () => {
                console.log("🎥 Host video track ended");
                setState((prev) => ({
                  ...prev,
                  isHostStreaming: false,
                  hostVideoTrack: null,
                  hostVideoPublication: null,
                }));
              });

              // Monitor track stream state changes (adaptive streaming)
              // Note: streamStateChanged might not be available in all LiveKit versions
              try {
                (track as any).on?.("streamStateChanged", (state: string) => {
                  console.log(
                    "🎥 Host video track stream state changed:",
                    state
                  );
                  if (state === "paused") {
                    console.log(
                      "🎥 Video stream paused due to network conditions"
                    );
                  } else if (state === "active") {
                    console.log("🎥 Video stream resumed");
                  }
                });
              } catch (e) {
                console.log("streamStateChanged event not available:", e);
              }

              console.log("✅ Host video subscribed successfully");

              // Start quality monitoring for participants
              if (!isHost) {
                const collectQualityStats = async () => {
                  try {
                    // Debug: Log all video elements
                    const allVideos = document.querySelectorAll("video");
                    console.log("=== Quality Stats Debug ===");
                    console.log(
                      "Total video elements found:",
                      allVideos.length
                    );

                    allVideos.forEach((video, i) => {
                      console.log(`Video ${i}:`, {
                        width: video.videoWidth,
                        height: video.videoHeight,
                        className: video.className,
                        dataset: video.dataset,
                        src: video.src,
                        hasSrcObject: !!video.srcObject,
                        readyState: video.readyState,
                      });
                    });

                    // Try multiple selectors to find the video element
                    let videoElement = document.querySelector(
                      "video[data-lk-track-id]"
                    ) as HTMLVideoElement;

                    if (!videoElement) {
                      videoElement = document.querySelector(
                        "video"
                      ) as HTMLVideoElement;
                    }

                    if (!videoElement) {
                      // Look for video elements with LiveKit classes
                      videoElement = document.querySelector(
                        ".lk-video-track video"
                      ) as HTMLVideoElement;
                    }

                    console.log("Selected video element:", videoElement);

                    // Get stats from the track and publication
                    const trackStats = track as any;
                    const pubStats = publication as any;

                    console.log("Track stats:", {
                      codec: trackStats.codec,
                      bitrate: trackStats.bitrate,
                      frameRate: trackStats.frameRate,
                      width: trackStats.width,
                      height: trackStats.height,
                      hasGetStats: !!trackStats.getStats,
                    });

                    console.log("Publication stats:", {
                      currentLayer: pubStats.currentLayer,
                      layer: pubStats.layer,
                      simulcastLayer: pubStats.simulcastLayer,
                      trackSid: pubStats.trackSid,
                      kind: pubStats.kind,
                    });

                    // Try to get codec from track or video element
                    let codec = "unknown";
                    try {
                      if (trackStats.codec) {
                        codec = trackStats.codec;
                      } else if (trackStats.codecId) {
                        codec = trackStats.codecId;
                      } else if (videoElement?.srcObject) {
                        const stream = videoElement.srcObject as MediaStream;
                        const videoTrack = stream.getVideoTracks()[0];
                        if (videoTrack) {
                          const settings = videoTrack.getSettings();
                          codec = (settings as any).codec || "unknown";
                        }
                      }

                      // Try to get codec from room stats
                      if (codec === "unknown") {
                        const r: any = roomRef.current;
                        if (r && r.getStats) {
                          const roomStats = await r.getStats();
                          if (roomStats && roomStats.inboundRtp) {
                            const inboundStats = roomStats.inboundRtp.find(
                              (stat: any) =>
                                stat.kind === "video" &&
                                stat.remoteId === hostId
                            );
                            if (inboundStats && inboundStats.codecId) {
                              codec = inboundStats.codecId;
                            }
                          }
                        }
                      }
                    } catch (e) {
                      console.warn("Failed to get codec:", e);
                    }

                    // Try to get bitrate from track stats
                    let bitrate = 0;
                    try {
                      if (trackStats.bitrate) {
                        bitrate = trackStats.bitrate;
                      } else if (trackStats.getStats) {
                        const stats = await trackStats.getStats();
                        if (stats && stats.bitrate) {
                          bitrate = stats.bitrate;
                        }
                      }
                    } catch (e) {
                      console.warn("Failed to get bitrate:", e);
                    }

                    // Try to get frame rate
                    let frameRate = 0;
                    try {
                      if (trackStats.frameRate) {
                        frameRate = trackStats.frameRate;
                      } else if (videoElement?.srcObject) {
                        const stream = videoElement.srcObject as MediaStream;
                        const videoTrack = stream.getVideoTracks()[0];
                        if (videoTrack) {
                          const settings = videoTrack.getSettings();
                          frameRate = settings.frameRate || 0;
                        }
                      }
                    } catch (e) {
                      console.warn("Failed to get frame rate:", e);
                    }

                    // Get resolution from video element or track
                    let resolution = "N/A";
                    if (
                      videoElement &&
                      videoElement.videoWidth &&
                      videoElement.videoHeight
                    ) {
                      resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
                    } else if (trackStats.width && trackStats.height) {
                      resolution = `${trackStats.width}x${trackStats.height}`;
                    }

                    // Get layer info
                    let layer = "unknown";
                    if (pubStats.currentLayer) {
                      layer = pubStats.currentLayer;
                    } else if (pubStats.layer) {
                      layer = pubStats.layer;
                    } else if (pubStats.simulcastLayer !== undefined) {
                      layer =
                        pubStats.simulcastLayer === 2
                          ? "high"
                          : pubStats.simulcastLayer === 1
                          ? "medium"
                          : "low";
                    } else if (pubStats.qualityLimitationReason) {
                      layer = pubStats.qualityLimitationReason;
                    }

                    // Try to determine layer from resolution
                    if (layer === "unknown" && resolution !== "N/A") {
                      const [width, height] = resolution.split("x").map(Number);
                      if (width >= 1920 && height >= 1080) {
                        layer = "high";
                      } else if (width >= 1280 && height >= 720) {
                        layer = "medium";
                      } else if (width >= 640 && height >= 480) {
                        layer = "low";
                      }
                    }

                    const stats = {
                      resolution: resolution,
                      codec: codec,
                      layer: layer,
                      bitrate: bitrate,
                      frameRate: frameRate,
                    };

                    console.log("Final stats:", stats);
                    setState((prev) => ({ ...prev, qualityStats: stats }));
                  } catch (error) {
                    console.warn("Failed to collect quality stats:", error);
                  }
                };

                // Also try to get stats from room stats API
                const collectRoomStats = async () => {
                  try {
                    const r: any = roomRef.current;
                    if (r && r.getStats) {
                      const roomStats = await r.getStats();
                      if (roomStats && roomStats.inboundRtp) {
                        const inboundStats = roomStats.inboundRtp.find(
                          (stat: any) =>
                            stat.kind === "video" && stat.remoteId === hostId
                        );
                        if (inboundStats) {
                          const stats = {
                            resolution:
                              inboundStats.frameWidth &&
                              inboundStats.frameHeight
                                ? `${inboundStats.frameWidth}x${inboundStats.frameHeight}`
                                : "N/A",
                            codec: inboundStats.codecId || "unknown",
                            layer:
                              inboundStats.qualityLimitationReason || "unknown",
                            bitrate: inboundStats.bytesReceived
                              ? inboundStats.bytesReceived * 8
                              : 0,
                            frameRate: inboundStats.framesPerSecond || 0,
                          };
                          setState((prev) => ({
                            ...prev,
                            qualityStats: stats,
                          }));
                        }
                      }
                    }
                  } catch (_) {}
                };

                // Also try to get stats from the video element that's attached to the track
                const collectAttachedVideoStats = () => {
                  try {
                    // The track should have an attached element
                    const attachedElement = (track as any)
                      .attachedElements?.[0];
                    if (
                      attachedElement &&
                      attachedElement.videoWidth &&
                      attachedElement.videoHeight
                    ) {
                      const stats = {
                        resolution: `${attachedElement.videoWidth}x${attachedElement.videoHeight}`,
                        codec: "unknown",
                        layer: "unknown",
                        bitrate: 0,
                        frameRate: 0,
                      };
                      console.log("Stats from attached element:", stats);
                      setState((prev) => ({ ...prev, qualityStats: stats }));
                    }
                  } catch (e) {
                    console.warn(
                      "Failed to get stats from attached element:",
                      e
                    );
                  }
                };

                // Try to get stats from any video element that has the track attached
                const collectAnyVideoStats = () => {
                  try {
                    const allVideos = document.querySelectorAll("video");
                    for (const video of allVideos) {
                      if (
                        video.videoWidth &&
                        video.videoHeight &&
                        video.srcObject
                      ) {
                        const stats = {
                          resolution: `${video.videoWidth}x${video.videoHeight}`,
                          codec: "unknown",
                          layer: "unknown",
                          bitrate: 0,
                          frameRate: 0,
                        };
                        console.log("Stats from any video element:", stats);
                        setState((prev) => ({ ...prev, qualityStats: stats }));
                        break; // Use the first valid video element
                      }
                    }
                  } catch (e) {
                    console.warn("Failed to get stats from any video:", e);
                  }
                };

                // Simple stats collection that just shows basic info
                const collectSimpleStats = () => {
                  try {
                    const allVideos = document.querySelectorAll("video");
                    console.log("=== Simple Stats Collection ===");
                    console.log("Total videos found:", allVideos.length);

                    let foundValidVideo = false;
                    for (const video of allVideos) {
                      console.log("Video element:", {
                        width: video.videoWidth,
                        height: video.videoHeight,
                        readyState: video.readyState,
                        hasSrcObject: !!video.srcObject,
                        className: video.className,
                      });

                      if (video.videoWidth && video.videoHeight) {
                        const stats = {
                          resolution: `${video.videoWidth}x${video.videoHeight}`,
                          codec: "unknown",
                          layer:
                            video.videoWidth >= 1920
                              ? "high"
                              : video.videoWidth >= 1280
                              ? "medium"
                              : "low",
                          bitrate: 0,
                          frameRate: 0,
                        };
                        console.log("Setting stats from video:", stats);
                        setState((prev) => ({ ...prev, qualityStats: stats }));
                        foundValidVideo = true;
                        break;
                      }
                    }

                    if (!foundValidVideo) {
                      console.log(
                        "No valid video found, setting default stats"
                      );
                      const defaultStats = {
                        resolution: "N/A",
                        codec: "unknown",
                        layer: "unknown",
                        bitrate: 0,
                        frameRate: 0,
                      };
                      setState((prev) => ({
                        ...prev,
                        qualityStats: defaultStats,
                      }));
                    }
                  } catch (e) {
                    console.warn("Simple stats collection failed:", e);
                  }
                };

                // Collect stats every 2 seconds
                const statsInterval = setInterval(() => {
                  collectSimpleStats();
                  collectQualityStats();
                  collectRoomStats();
                  collectAttachedVideoStats();
                  collectAnyVideoStats();
                }, 2000);

                collectSimpleStats(); // Initial simple collection
                collectQualityStats(); // Initial collection
                collectRoomStats(); // Initial room stats
                collectAttachedVideoStats(); // Initial attached element stats
                collectAnyVideoStats(); // Initial any video stats

                // Store cleanup function
                (track as any)._cleanupStats = () => {
                  clearInterval(statsInterval);
                  setState((prev) => ({ ...prev, qualityStats: {} }));
                };
              }
            }
          }
        );

        room.on(
          RoomEventEnum.TrackUnsubscribed,
          (
            track: Track,
            _publication: TrackPublication,
            participant: RemoteParticipant
          ) => {
            if (track.kind === "video" && participant.identity === hostId) {
              console.log("❌ Host video track unsubscribed");

              // Clear the video track from state immediately
              setState((prev) => ({
                ...prev,
                hostVideoTrack: null,
                hostVideoPublication: null,
              }));

              // Check if host is still streaming after a short delay
              setTimeout(() => {
                const r = roomRef.current as LiveKitClientRoom | null;
                if (!r) return;

                const host = r.remoteParticipants.get(hostId);
                if (!host) {
                  console.log(
                    "❌ Host disconnected - clearing streaming state"
                  );
                  setState((prev) => ({
                    ...prev,
                    isHostStreaming: false,
                  }));
                  return;
                }

                const pubs = host.getTrackPublications();
                const videoPubs = pubs.filter(
                  (p) => p.kind === "video" && p.isSubscribed
                );

                if (videoPubs.length > 0) {
                  console.log(
                    "🔄 Host still has active video tracks - will resubscribe automatically"
                  );
                  // Don't force resubscribe - let LiveKit handle it naturally
                } else {
                  console.log(
                    "❌ No active video tracks - host stopped streaming"
                  );
                  setState((prev) => ({
                    ...prev,
                    isHostStreaming: false,
                  }));
                }
              }, 2000);
            }
          }
        );

        // Listen for track unpublished (host stops streaming completely)
        room.on(
          RoomEventEnum.TrackUnpublished,
          (publication: TrackPublication, participant: RemoteParticipant) => {
            if (
              publication.kind === "video" &&
              participant.identity === hostId
            ) {
              console.log("❌ Host video track unpublished");
              setState((prev) => ({
                ...prev,
                isHostStreaming: false,
                hostVideoTrack: null,
                hostVideoPublication: null,
                qualityStats: {},
              }));
            }
          }
        );

        // Listen for participant disconnected
        room.on(
          RoomEventEnum.ParticipantDisconnected,
          (participant: RemoteParticipant) => {
            if (participant.identity === hostId) {
              console.log("❌ Host participant disconnected");
              setState((prev) => ({
                ...prev,
                isHostStreaming: false,
                hostVideoTrack: null,
                hostVideoPublication: null,
                qualityStats: {},
              }));
            }
          }
        );

        // Reconnected: if we were streaming as host, republish
        room.on(RoomEventEnum.Reconnected, async () => {
          try {
            if (isHost && localTrackRef.current) {
              const r: any = roomRef.current;
              if (r?.state === "connected") {
                console.log("Reconnected as host, republishing video track");
                await r.localParticipant.publishTrack(localTrackRef.current, {
                  // For VP9 SVC, we don't use simulcast - scalabilityMode handles layers
                  videoCodec: "vp9",
                  scalabilityMode: "L3T3", // VP9 SVC with 3 spatial and 3 temporal layers
                } as any);
              }
            } else if (!isHost) {
              // For participants, check for existing host video and resubscribe
              console.log(
                "Reconnected as participant, checking for host video"
              );
              setTimeout(() => {
                room?.remoteParticipants.forEach((rp: RemoteParticipant) => {
                  if (rp.identity === hostId) {
                    rp.getTrackPublications().forEach(
                      (pub: TrackPublication) => {
                        if (pub.kind === "video") {
                          console.log(
                            `Found host video: subscribed=${
                              pub.isSubscribed
                            }, track=${!!pub.track}`
                          );
                          if (!pub.isSubscribed) {
                            console.log(
                              "Resubscribing to host video after reconnection"
                            );
                            try {
                              // Use the correct LiveKit API for subscription
                              if ((pub as any).setSubscribed) {
                                (pub as any).setSubscribed(true);
                              } else if ((rp as any).requestSubscription) {
                                (rp as any).requestSubscription(
                                  pub.trackSid,
                                  true
                                );
                              }
                            } catch (e) {
                              console.warn(
                                "Failed to resubscribe to host video:",
                                e
                              );
                            }
                          } else if (pub.track) {
                            // Already subscribed, update state
                            console.log(
                              "Host video already subscribed, updating state"
                            );
                            setState((prev) => ({
                              ...prev,
                              isHostStreaming: true,
                              hostVideoTrack: pub.track as RemoteVideoTrack,
                              hostVideoPublication: pub,
                            }));
                          }
                        }
                      }
                    );
                  }
                });
              }, 1000);
            }
          } catch (e) {
            console.warn("Failed to handle reconnection:", e);
          }
        });

        // After connection, immediately check for existing host video and subscribe
        if (!isHost) {
          console.log("🔍 Checking for existing host video track...");

          // Immediate check for existing video track
          const checkForHostVideo = () => {
            room?.remoteParticipants.forEach((rp: RemoteParticipant) => {
              if (rp.identity === hostId) {
                console.log(`Found host participant: ${rp.identity}`);
                rp.getTrackPublications().forEach((pub: TrackPublication) => {
                  if (pub.kind === "video") {
                    console.log(
                      `Found host video publication: ${pub.trackSid}, subscribed: ${pub.isSubscribed}`
                    );

                    if (pub.isSubscribed && pub.track) {
                      console.log(
                        "✅ Host video already subscribed, updating state"
                      );
                      setState((prev) => ({
                        ...prev,
                        isHostStreaming: true,
                        hostVideoTrack: pub.track as RemoteVideoTrack,
                        hostVideoPublication: pub,
                      }));

                      // Set high quality once
                      try {
                        const pubAny = pub as any;
                        pubAny.setPriority?.("high");
                        pubAny.setVideoQuality?.("high");
                      } catch (_) {}
                    } else if (!pub.isSubscribed) {
                      console.log(
                        "🔄 Host video not subscribed, subscribing now..."
                      );
                      try {
                        // Use the correct LiveKit API for subscription
                        if ((pub as any).setSubscribed) {
                          (pub as any).setSubscribed(true);
                        } else if ((rp as any).requestSubscription) {
                          (rp as any).requestSubscription(pub.trackSid, true);
                        }
                      } catch (e) {
                        console.warn("Failed to subscribe to host video:", e);
                      }
                    }
                  }
                });
              }
            });
          };

          // Check immediately
          checkForHostVideo();

          // Also check periodically for 5 seconds with faster intervals
          let tries = 0;
          const iv = setInterval(() => {
            tries += 1;
            checkForHostVideo();
            if (tries > 10) clearInterval(iv); // 5 seconds total
          }, 500);
        }

        // Add connection state monitoring for better debugging
        room.on(RoomEventEnum.ConnectionStateChanged, (state) => {
          console.log("LiveKit connection state changed:", state);
          if (state === "disconnected") {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              isHostStreaming: false,
              hostVideoTrack: null,
              hostVideoPublication: null,
            }));
          }
        });

        // Add reconnecting state monitoring
        room.on(RoomEventEnum.Reconnecting, () => {
          console.log("LiveKit reconnecting...");
        });

        // Add periodic subscription check for participants to ensure they stay subscribed
        if (!isHost && room) {
          periodicCheckRef.current = setInterval(() => {
            const currentRoom = roomRef.current;
            if (!currentRoom) return;
            const host = currentRoom.remoteParticipants.get(hostId);
            if (host) {
              const videoPubs = host
                .getTrackPublications()
                .filter((p) => p.kind === "video");
              if (videoPubs.length > 0) {
                const hasSubscribedVideo = videoPubs.some(
                  (p) => p.isSubscribed && p.track
                );
                if (!hasSubscribedVideo && !subscriptionInProgressRef.current) {
                  console.log(
                    "🔄 No subscribed video found, attempting to resubscribe"
                  );
                  subscribeHostIfAny(host);
                }
              }
            }
          }, 10000); // Check every 10 seconds

          // Clean up interval on component unmount
          return () => {
            if (periodicCheckRef.current) {
              clearInterval(periodicCheckRef.current);
              periodicCheckRef.current = null;
            }
          };
        }

        // Optional: swallow low-level datachannel errors in dev
        try {
          const engine = (room as any)?.engine;
          engine?.on?.("dataChannelError", () => {});
        } catch (_) {}

        // Receive host max preset announcements
        room.on(
          RoomEventEnum.DataReceived,
          (payload: Uint8Array, participant?: RemoteParticipant) => {
            try {
              if (!participant || participant.identity !== hostId) return;
              const txt = new TextDecoder().decode(payload);
              const msg = JSON.parse(txt);
              if (
                msg?.type === "hostMaxPreset" &&
                (msg.preset === "1080p" ||
                  msg.preset === "720p" ||
                  msg.preset === "540p")
              ) {
                setState((prev) => ({ ...prev, hostMaxPreset: msg.preset }));
              }
            } catch (_) {}
          }
        );
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: "Failed to connect to streaming room",
        }));
      }
    };

    connectToRoom();

    return () => {
      const r = roomRef.current as any;
      try {
        if (r && r.state === "connected") {
          r.disconnect();
        }
      } catch (_) {}

      // Clean up all intervals
      if (aggressiveCheckRef.current) {
        clearInterval(aggressiveCheckRef.current);
        aggressiveCheckRef.current = null;
      }
      if (periodicCheckRef.current) {
        clearInterval(periodicCheckRef.current);
        periodicCheckRef.current = null;
      }

      // Reset subscription flag
      subscriptionInProgressRef.current = false;

      roomRef.current = null;
      localTrackRef.current = null;
    };
  }, [roomId, livekitToken, currentUserId, hostId, isHost]);

  // Helper: publish with small retry for robustness
  const publishWithRetry = async (track: LocalVideoTrack, encoding?: any) => {
    const r: any = roomRef.current;
    if (!r || r.state !== "connected") return false;
    let attempt = 0;
    while (attempt < 3) {
      try {
        const publication = await r.localParticipant.publishTrack(track, {
          // Force high quality - disable adaptive streaming
          videoEncoding: encoding,
          videoCodec: "vp9",
          scalabilityMode: "L3T3", // VP9 SVC with 3 spatial and 3 temporal layers
          // Disable adaptive streaming
          adaptiveStream: false,
          // Disable dynacast - force high quality
          dynacast: false,
          // Force high priority
          priority: "high",
          // Disable simulcast - single high quality stream
          simulcast: false,
          // Force high quality layer
          videoQuality: "high",
        } as any);

        // Let LiveKit handle quality naturally - no forced enforcement
        console.log("✅ Video track published successfully");

        return true;
      } catch (_) {
        attempt += 1;
        await new Promise((res) => setTimeout(res, 250 * attempt));
      }
    }
    return false;
  };

  // On-demand connect helper
  const ensureConnected = useCallback(async (): Promise<boolean> => {
    try {
      const lk: any = await import("livekit-client");
      let token = livekitToken;
      if (!token && currentUserId && roomId) {
        try {
          const res = await fetch("/api/livekit-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUserId,
              roomId,
              role: isHost ? "host" : "participant",
            }),
          });
          const data = await res.json();
          token = data.token;
          setLivekitToken(token);
        } catch (_) {}
      }
      if (!token) return false;

      let r: any = roomRef.current;
      if (!r) {
        const RoomCtor = lk.Room as typeof LiveKitClientRoom;
        r = new RoomCtor({
          // Disable adaptive streaming - force high quality
          adaptiveStream: false,
          // Disable dynacast - force high quality
          dynacast: false,
          stopLocalTrackOnUnpublish: true,
        } as any);
        roomRef.current = r;
      }
      if (r.state !== "connected") {
        await r.connect(process.env.NEXT_PUBLIC_LIVEKIT_API_URL!, token);
        setState((prev) => ({ ...prev, room: r }));
      }
      return r.state === "connected";
    } catch (_) {
      return false;
    }
  }, [livekitToken, currentUserId, roomId, isHost]);

  // Helper to announce host preset to participants
  const broadcastHostPreset = useCallback(() => {
    try {
      const r: any = roomRef.current;
      if (!r || r.state !== "connected") return;
      const msg = JSON.stringify({
        type: "hostMaxPreset",
        preset: "1080p",
      });
      const data = new TextEncoder().encode(msg);
      r.localParticipant.publishData?.(data, { reliable: true });
    } catch (_) {}
  }, []);

  // Start chart streaming (host only)
  const startChartStream = useCallback(async () => {
    if (!isHost) return;

    try {
      const connected = await ensureConnected();
      const r: any = roomRef.current;
      if (!connected || !r || r.state !== "connected") {
        setState((p) => ({
          ...p,
          error: "Not connected to streaming room yet",
        }));
        return;
      }

      // Clean up any stale local screen-share publication before starting again
      try {
        const pubs = r.localParticipant.getTrackPublications?.() || [];
        pubs.forEach((pub: any) => {
          if (pub.kind === "video" && pub.track) {
            try {
              r.localParticipant.unpublishTrack(pub.track);
            } catch (_) {}
          }
        });
        if (localTrackRef.current) {
          try {
            localTrackRef.current.stop();
          } catch (_) {}
          localTrackRef.current = null;
        }
      } catch (_) {}

      const lk: any = await import("livekit-client");

      // Prefer LiveKit's screen-share track creator with presets
      let videoTrack: LocalVideoTrack | null = null;
      try {
        const preset = lk.ScreenSharePresets?.h1080fps30 || undefined;
        const tracks = await lk.createScreenShareTracks?.({
          resolution: { width: 1920, height: 1080 },
          screenSharePreset: preset,
          captureAudio: false,
          videoCodec: "vp9",
          maxBitrate: 8_000_000, // 8 Mbps for 1080p
          keyFrameInterval: 2, // 2 seconds for better quality
        });
        if (Array.isArray(tracks)) {
          const vt = tracks.find((t: any) => t.kind === "video");
          if (vt) {
            videoTrack = vt;
          }
        }
      } catch (_) {}

      // Fallback to getDisplayMedia if helper not available
      if (!videoTrack) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        });
        const mediaTrack = stream.getVideoTracks()[0];
        if (!mediaTrack) {
          setState((p) => ({ ...p, error: "No screen selected for sharing" }));
          return;
        }
        try {
          if ("contentHint" in mediaTrack) {
            (mediaTrack as any).contentHint = "detail";
          }
          (mediaTrack as any).source = "screen_share";
        } catch (_) {}
        videoTrack = new LocalVideoTrack(mediaTrack);
      }

      localTrackRef.current = videoTrack;

      // Build encoding based on preset with higher bitrates for screen sharing
      const encoding = {
        maxBitrate: 8_000_000,
        maxFramerate: 30,
        keyFrameInterval: 2,
      } as any;

      const ok = await publishWithRetry(videoTrack!, encoding);
      if (!ok) {
        setState((p) => ({ ...p, error: "Failed to publish stream" }));
        try {
          videoTrack!.stop();
        } catch (_) {}
        localTrackRef.current = null;
        return;
      }

      setState((prev) => ({
        ...prev,
        isStreaming: true,
        localVideoTrack: videoTrack!,
        error: null,
      }));

      // Announce current preset to participants
      broadcastHostPreset();

      // Handle end with automatic restart (like YouTube/Twitch)
      try {
        const media = (videoTrack as any).mediaStreamTrack as
          | MediaStreamTrack
          | undefined;
        if (media) {
          media.onended = () => {
            console.log(
              "🚨 Host video track ended - attempting automatic restart"
            );
            try {
              if (
                roomRef.current &&
                (roomRef.current as any).state === "connected" &&
                videoTrack
              ) {
                (roomRef.current as any).localParticipant.unpublishTrack(
                  videoTrack
                );
              }
            } catch (_) {}
            videoTrack?.stop();
            localTrackRef.current = null;
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              localVideoTrack: null,
            }));

            // Automatically restart streaming after 2 seconds
            setTimeout(() => {
              console.log("🔄 Auto-restarting host stream...");
              startChartStream();
            }, 2000);
          };
        }
      } catch (_) {}
    } catch (error: any) {
      const name = error?.name || "Error";
      if (name === "NotAllowedError") {
        setState((prev) => ({
          ...prev,
          error: "Screen share was blocked. Please allow screen capture.",
        }));
      } else if (name === "NotFoundError") {
        setState((prev) => ({ ...prev, error: "No screen/window selected." }));
      } else {
        setState((prev) => ({
          ...prev,
          error: "Failed to start chart streaming",
        }));
      }
    }
  }, [isHost, state.hostPreset, ensureConnected, broadcastHostPreset]);

  // Stop chart streaming (host only)
  const stopChartStream = useCallback(async () => {
    if (!isHost || !roomRef.current || !state.localVideoTrack) return;

    try {
      const r: any = roomRef.current;
      if (r.state === "connected") {
        await r.localParticipant.unpublishTrack(state.localVideoTrack);
      }
      state.localVideoTrack.stop();
      localTrackRef.current = null;
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        localVideoTrack: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to stop chart streaming",
      }));
    }
  }, [isHost, state.localVideoTrack]);

  // Participant: choose viewing quality (simulcast layer)
  const setViewerQuality = useCallback(
    async (quality: ViewerQuality) => {
      // Track manual quality changes
      const now = Date.now();
      (window as any).lastManualQualityChange = now;

      console.log("=== setViewerQuality called ===");
      console.log("Requested quality:", quality);
      console.log("Current state quality:", state.viewerQuality);

      setState((prev) => ({ ...prev, viewerQuality: quality }));
      try {
        const lk: any = await import("livekit-client");
        const pub = state.hostVideoPublication as any;
        if (!pub) {
          console.warn("No host video publication found");
          return;
        }

        console.log("Setting viewer quality to:", quality);
        console.log("Publication:", pub);

        // Removed duplicate setVideoQuality call - using the one below

        // Try setting priority (use numeric values)
        if (pub.setPriority) {
          const priority =
            quality === "high"
              ? 2 // 0=low, 1=medium, 2=high
              : quality === "medium"
              ? 1
              : 0;
          console.log("Setting priority to:", priority);
          pub.setPriority(priority);
        }

        // Try setting subscription quality
        if (pub.setSubscribed) {
          console.log("Ensuring subscription is enabled");
          pub.setSubscribed(true);
        }

        // For VP9 SVC, we don't use simulcast layers - use scalability mode instead
        // The scalabilityMode "L3T3" provides 3 spatial layers (0, 1, 2) and 3 temporal layers
        if (pub.setSimulcastLayer) {
          const layer = quality === "high" ? 2 : quality === "medium" ? 1 : 0;
          console.log("Setting VP9 SVC spatial layer to:", layer);
          pub.setSimulcastLayer(layer);
        }

        // Use only the most effective method to prevent multiple refreshes
        if (pub.setVideoQuality) {
          const qualityMap = {
            high: 2, // 0=low, 1=medium, 2=high
            medium: 1,
            low: 0,
          };
          const qualityValue = qualityMap[quality];
          console.log(
            "Setting video quality to:",
            qualityValue,
            "for",
            quality
          );
          try {
            pub.setVideoQuality(qualityValue);
            console.log("Successfully set video quality");
          } catch (e) {
            console.warn("Failed to set video quality:", e);
          }
        } else {
          console.warn("setVideoQuality method not available on publication");
        }

        // For VP9 SVC, set the spatial layer (this is the most important)
        if (pub.setSimulcastLayer) {
          const spatialLayer =
            quality === "high" ? 2 : quality === "medium" ? 1 : 0;
          console.log(
            "Setting VP9 SVC spatial layer to:",
            spatialLayer,
            "for",
            quality
          );
          try {
            pub.setSimulcastLayer(spatialLayer);
            console.log("Successfully set spatial layer");
          } catch (e) {
            console.warn("Failed to set VP9 SVC spatial layer:", e);
          }
        } else {
          console.warn("setSimulcastLayer method not available on publication");
        }

        // Ensure subscription is enabled (minimal approach to prevent refreshes)
        if (pub.setSubscribed) {
          console.log("Ensuring subscription is enabled");
          pub.setSubscribed(true);
        }
      } catch (error) {
        console.warn("Failed to set viewer quality:", error);
      }
    },
    [state.hostVideoPublication, state.hostVideoTrack]
  );

  // Default participant layer based on viewport
  useEffect(() => {
    if (!isHost && state.hostVideoPublication) {
      const width = window.innerWidth || 0;
      if (width >= 1280) {
        setViewerQuality("high");
      } else if (width >= 800) {
        setViewerQuality("medium");
      } else {
        setViewerQuality("low");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hostVideoPublication]);

  // Handle tab visibility changes to maintain quality and stream
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible - refreshing stream and quality");

        // Don't change quality settings on tab visibility - let user control it
        if (!isHost && state.hostVideoPublication) {
          console.log(
            "Tab became visible - maintaining current quality setting:",
            state.viewerQuality
          );
          // No quality changes - user has full control
        }

        // Refresh video elements and reattach tracks
        setTimeout(() => {
          const videoElements = document.querySelectorAll("video");
          videoElements.forEach((video) => {
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream;
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                // Apply gentle constraints without min values to avoid OverconstrainedError
                videoTrack
                  .applyConstraints({
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                  })
                  .catch((e) =>
                    console.warn("Failed to apply constraints:", e)
                  );
              }
            } else if (state.hostVideoTrack) {
              // Reattach the track if video element is empty
              console.log(
                "Reattaching host video track to empty video element"
              );
              state.hostVideoTrack.attach(video);
            }
          });
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isHost, state.hostVideoPublication]);

  // Host preset is fixed to 1080p; broadcast once on connect
  const setHostPreset = useCallback(() => undefined as any, []);

  // Manual stats refresh function
  const refreshStats = useCallback(() => {
    if (!isHost && state.hostVideoTrack) {
      const allVideos = document.querySelectorAll("video");
      console.log("=== Manual Stats Refresh ===");
      console.log("Total videos found:", allVideos.length);

      for (const video of allVideos) {
        console.log("Video element:", {
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
          hasSrcObject: !!video.srcObject,
          className: video.className,
        });

        if (video.videoWidth && video.videoHeight) {
          const stats = {
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            codec: "unknown",
            layer:
              video.videoWidth >= 1920
                ? "high"
                : video.videoWidth >= 1280
                ? "medium"
                : "low",
            bitrate: 0,
            frameRate: 0,
          };
          console.log("Manual refresh - setting stats:", stats);
          setState((prev) => ({ ...prev, qualityStats: stats }));
          return;
        }
      }

      console.log("No valid video found in manual refresh");
    }
  }, [isHost, state.hostVideoTrack]);

  // Force high quality function
  const forceHighQuality = useCallback(async () => {
    if (!isHost && state.hostVideoPublication) {
      console.log("=== Force High Quality ===");
      try {
        const pub = state.hostVideoPublication as any;
        const track = state.hostVideoTrack as any;

        // Try all possible methods to force high quality
        console.log("Trying to force high quality...");

        // Method 1: Set video quality (use numeric values)
        if (pub.setVideoQuality) {
          console.log("Method 1: setVideoQuality(2) - using numeric value");
          pub.setVideoQuality(2); // 0=low, 1=medium, 2=high
        }

        // Method 2: Set VP9 SVC spatial layer
        if (pub.setSimulcastLayer) {
          console.log("Method 2: setSimulcastLayer(2) - VP9 SVC spatial layer");
          pub.setSimulcastLayer(2); // 2 = highest spatial layer for VP9 SVC
        }

        // Method 3: Set priority (use numeric values)
        if (pub.setPriority) {
          console.log("Method 3: setPriority(2) - using numeric value");
          pub.setPriority(2); // 0=low, 1=medium, 2=high
        }

        // Method 4: Track quality (use numeric values)
        if (track && track.setVideoQuality) {
          console.log(
            "Method 4: track.setVideoQuality(2) - using numeric value"
          );
          track.setVideoQuality(2); // 0=low, 1=medium, 2=high
        }

        // Method 5: Force track refresh
        if (track) {
          console.log("Method 5: Force track refresh");
          try {
            await track.switchOff?.();
            await new Promise((resolve) => setTimeout(resolve, 200));
            await track.switchOn?.();
          } catch (e) {
            console.warn("Track refresh failed:", e);
          }
        }

        // Method 6: Room subscription API
        const r: any = roomRef.current;
        if (r && r.localParticipant && pub.trackSid) {
          console.log("Method 6: Room subscription API");
          try {
            if (r.localParticipant.setSubscribed) {
              await r.localParticipant.setSubscribed(pub.trackSid, false);
              await new Promise((resolve) => setTimeout(resolve, 200));
              await r.localParticipant.setSubscribed(pub.trackSid, true);
            } else if (r.localParticipant.unsubscribe) {
              await r.localParticipant.unsubscribe(pub.trackSid);
              await new Promise((resolve) => setTimeout(resolve, 200));
              await r.localParticipant.subscribe(pub.trackSid);
            }
          } catch (e) {
            console.warn("Room subscription API failed:", e);
          }
        }

        // Method 7: Try to find the remote participant and request high quality
        try {
          const r: any = roomRef.current;
          if (r && r.remoteParticipants) {
            console.log("Method 7: Remote participant quality request");
            const remoteParticipants = Array.from(
              r.remoteParticipants.values()
            );
            const hostParticipant = remoteParticipants.find(
              (p: any) => p.identity === hostId
            );
            if (
              hostParticipant &&
              (hostParticipant as any).requestSubscription
            ) {
              console.log("Requesting high quality from host participant");
              await (hostParticipant as any).requestSubscription(
                pub.trackSid,
                true
              );
            }
          }
        } catch (e) {
          console.warn("Remote participant quality request failed:", e);
        }

        // Method 8: Try to force video element to request high quality
        try {
          console.log("Method 8: Video element quality manipulation");
          const allVideos = document.querySelectorAll("video");
          for (const video of allVideos) {
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream;
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                console.log("Applying high quality constraints to video track");
                await videoTrack.applyConstraints({
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                  frameRate: { ideal: 30 },
                });
              }
            }
          }
        } catch (e) {
          console.warn("Video element quality manipulation failed:", e);
        }

        // Method 9: Use LiveKit's proper subscription control
        try {
          console.log("Method 9: LiveKit subscription control");
          const pub = state.hostVideoPublication as any;
          if (pub && pub.setSubscribed) {
            console.log("Using setSubscribed to force quality refresh");
            await pub.setSubscribed(false);
            await new Promise((resolve) => setTimeout(resolve, 300));
            await pub.setSubscribed(true);
          }
        } catch (e) {
          console.warn("LiveKit subscription control failed:", e);
        }

        // Method 10: VP9 SVC specific quality forcing
        try {
          console.log("Method 10: VP9 SVC quality forcing");
          const videoElements = document.querySelectorAll("video");
          for (const video of videoElements) {
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream;
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                console.log("Forcing VP9 SVC high quality constraints");
                await videoTrack.applyConstraints({
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                  frameRate: { ideal: 30 },
                });
              }
            }
          }
        } catch (e) {
          console.warn("VP9 SVC quality forcing failed:", e);
        }

        console.log("Force high quality completed");

        // Refresh stats after a delay
        setTimeout(() => {
          refreshStats();
        }, 2000);
      } catch (error) {
        console.warn("Force high quality failed:", error);
      }
    }
  }, [
    isHost,
    state.hostVideoPublication,
    state.hostVideoTrack,
    refreshStats,
    hostId,
  ]);

  // Periodic quality enforcement DISABLED to prevent interference with manual quality selection
  // The user should have full control over quality selection without automatic overrides
  useEffect(() => {
    if (isHost || !state.hostVideoPublication) return;

    console.log(
      "Periodic quality enforcement disabled - user has full control"
    );

    // Only log quality issues for debugging, don't enforce
    const logQuality = () => {
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((video) => {
        if (video.videoWidth && video.videoHeight) {
          const resolution = video.videoWidth * video.videoHeight;
          console.log(
            `Current video resolution: ${video.videoWidth}x${video.videoHeight} (${resolution} pixels)`
          );
        }
      });
    };

    // Log quality every 10 seconds for debugging only
    const qualityInterval = setInterval(logQuality, 10000);
    return () => clearInterval(qualityInterval);
  }, [isHost, state.hostVideoPublication]);

  // Permanent video connection maintenance (participants only) - like YouTube/Twitch
  useEffect(() => {
    if (isHost || !state.room) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let lastSuccessfulCheck = Date.now();

    const maintainVideoConnection = () => {
      const r = roomRef.current as LiveKitClientRoom | null;
      if (!r) {
        console.log("🔍 No room connection - attempting to reconnect");
        reconnectAttempts++;
        if (reconnectAttempts <= maxReconnectAttempts) {
          ensureConnected().then((connected) => {
            if (connected) {
              console.log("✅ Room reconnected successfully");
              reconnectAttempts = 0;
              lastSuccessfulCheck = Date.now();
            }
          });
        }
        return;
      }

      const host = r.remoteParticipants.get(hostId);
      if (!host) {
        console.log("🔍 Host not found - waiting for host to join");
        return;
      }

      const videoPubs = host
        .getTrackPublications()
        .filter((p) => p.kind === "video");

      if (videoPubs.length === 0) {
        console.log(
          "🔍 No host video publications - host may not be streaming"
        );
        return;
      }

      const subscribedVideo = videoPubs.find((p) => p.isSubscribed && p.track);
      const unsubscribedVideo = videoPubs.find((p) => !p.isSubscribed);

      console.log(
        `🔍 Video status: ${videoPubs.length} total, ${
          subscribedVideo ? "1" : "0"
        } subscribed, ${unsubscribedVideo ? "1" : "0"} unsubscribed`
      );

      // CRITICAL: Always ensure we have a subscribed video if host is streaming
      if (state.isHostStreaming && !subscribedVideo) {
        console.log(
          "🚨 CRITICAL: Host streaming but no subscribed video - immediate resubscribe"
        );
        if (unsubscribedVideo) {
          try {
            if ((unsubscribedVideo as any).setSubscribed) {
              (unsubscribedVideo as any).setSubscribed(true);
              console.log("✅ Emergency resubscribed to host video");
              lastSuccessfulCheck = Date.now();
            }
          } catch (e) {
            console.warn("Failed emergency resubscribe:", e);
          }
        }
      }

      // Update state if we have subscribed video but state is incorrect
      if (subscribedVideo && !state.isHostStreaming) {
        console.log(
          "🔄 Found subscribed video but state incorrect - updating state"
        );
        setState((prev) => ({
          ...prev,
          isHostStreaming: true,
          hostVideoTrack: subscribedVideo.track as RemoteVideoTrack,
          hostVideoPublication: subscribedVideo,
        }));
        lastSuccessfulCheck = Date.now();
      }

      // Reset reconnect attempts on successful check
      if (subscribedVideo) {
        reconnectAttempts = 0;
        lastSuccessfulCheck = Date.now();
      }

      // If no successful check for 30 seconds, try to reconnect
      if (Date.now() - lastSuccessfulCheck > 30000) {
        console.log(
          "🚨 No successful video check for 30s - attempting room reconnection"
        );
        ensureConnected().then((connected) => {
          if (connected) {
            console.log("✅ Room reconnected after timeout");
            lastSuccessfulCheck = Date.now();
          }
        });
      }
    };

    // Check every 5 seconds for maximum responsiveness
    const interval = setInterval(maintainVideoConnection, 5000);

    // Also check immediately
    maintainVideoConnection();

    return () => clearInterval(interval);
  }, [isHost, state.room, hostId, state.isHostStreaming, ensureConnected]);

  // Host stream monitoring - ensure stream never stops (like YouTube/Twitch)
  useEffect(() => {
    if (!isHost || !state.isStreaming) return;

    const monitorHostStream = () => {
      const r = roomRef.current as LiveKitClientRoom | null;
      if (!r || r.state !== "connected") {
        console.log("🚨 Host room disconnected - attempting reconnection");
        ensureConnected().then((connected) => {
          if (connected && state.localVideoTrack) {
            console.log("🔄 Republishing video after reconnection");
            publishWithRetry(state.localVideoTrack, {
              maxBitrate: 8_000_000,
              maxFramerate: 30,
              keyFrameInterval: 2,
            });
          }
        });
        return;
      }

      // Check if video track is still active
      if (state.localVideoTrack) {
        const mediaTrack = (state.localVideoTrack as any).mediaStreamTrack;
        if (mediaTrack && mediaTrack.readyState === "ended") {
          console.log("🚨 Host video track ended - restarting stream");
          startChartStream();
        }
      }
    };

    // Check every 10 seconds
    const interval = setInterval(monitorHostStream, 10000);
    return () => clearInterval(interval);
  }, [
    isHost,
    state.isStreaming,
    state.localVideoTrack,
    ensureConnected,
    publishWithRetry,
    startChartStream,
  ]);

  // Cleanup quality monitors on unmount
  useEffect(() => {
    return () => {
      if (state.qualityMonitor) {
        clearInterval(state.qualityMonitor);
      }
      if (state.participantQualityMonitor) {
        clearInterval(state.participantQualityMonitor);
      }
    };
  }, [state.qualityMonitor, state.participantQualityMonitor]);

  return {
    ...state,
    isHost,
    startChartStream,
    stopChartStream,
    setViewerQuality,
    setHostPreset,
    refreshStats,
    forceHighQuality,
  };
}
