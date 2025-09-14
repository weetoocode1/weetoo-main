"use client";

import {
  ResolutionString,
  LanguageCode,
  ChartingLibraryWidgetOptions,
} from "@/public/static/charting_library";
import dynamic from "next/dynamic";
import Script from "next/script";
import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import { useChartStreaming } from "@/hooks/use-chart-streaming";
import { Video, VideoOff } from "lucide-react";

// Dynamic import for TradingView chart
const TradingViewChart = dynamic(
  () => import("@/components/trading-view").then((mod) => mod.TradingViewChart),
  { ssr: false }
);

interface TradingViewChartProps {
  symbol: string;
  isHost?: boolean;
  roomId?: string;
  hostId?: string;
}

export const TradingViewChartComponent = React.memo(
  ({ symbol, isHost = false, roomId, hostId }: TradingViewChartProps) => {
    const [isScriptReady, setIsScriptReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Get chart streaming state
    const {
      isHostStreaming,
      hostVideoTrack,
      error: streamingError,
    } = useChartStreaming(roomId || "", hostId || "");

    // Attach video track to video element with robust error handling
    useEffect(() => {
      if (hostVideoTrack && videoRef.current) {
        console.log("🎥 Attaching host video track to video element");

        const videoElement = videoRef.current;

        // Configure video element first
        videoElement.muted = true; // Ensure muted to prevent audio issues
        videoElement.playsInline = true; // Important for mobile
        videoElement.autoplay = true;
        videoElement.controls = false; // Hide controls for cleaner look

        // Set video quality attributes
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "contain";
        videoElement.style.backgroundColor = "black";

        // Add event listeners for better debugging
        const handleLoadStart = () => console.log("🎥 Video load started");
        const handleLoadedData = () => console.log("🎥 Video data loaded");
        const handleCanPlay = () => console.log("🎥 Video can play");
        const handleError = (e: Event) => console.error("🎥 Video error:", e);
        const handleEnded = () => console.log("🎥 Video ended");
        const handleStalled = () => console.warn("🎥 Video stalled");
        const handleSuspend = () => console.warn("🎥 Video suspended");
        const handleWaiting = () => console.warn("🎥 Video waiting");
        const handlePlay = () => console.log("🎥 Video playing");
        const handlePause = () => console.warn("🎥 Video paused");

        videoElement.addEventListener("loadstart", handleLoadStart);
        videoElement.addEventListener("loadeddata", handleLoadedData);
        videoElement.addEventListener("canplay", handleCanPlay);
        videoElement.addEventListener("error", handleError);
        videoElement.addEventListener("ended", handleEnded);
        videoElement.addEventListener("stalled", handleStalled);
        videoElement.addEventListener("suspend", handleSuspend);
        videoElement.addEventListener("waiting", handleWaiting);
        videoElement.addEventListener("play", handlePlay);
        videoElement.addEventListener("pause", handlePause);

        // Attach the track with error handling
        try {
          hostVideoTrack.attach(videoElement);
          console.log("✅ Video track attached successfully");
        } catch (error) {
          console.error("❌ Failed to attach video track:", error);
        }

        // Enhanced video health monitoring
        let consecutiveFailures = 0;
        const maxFailures = 3;

        const checkVideoHealth = () => {
          // Check if video element is visible and has proper dimensions
          const rect = videoElement.getBoundingClientRect();
          const isVisible =
            rect.width > 0 &&
            rect.height > 0 &&
            !videoElement.hidden &&
            videoElement.offsetParent !== null;

          if (!isVisible) {
            console.warn("🎥 Video element not visible, dimensions:", rect);
            return;
          }

          // Check if video is paused unexpectedly
          if (videoElement.paused && !videoElement.ended) {
            console.log("🎥 Video paused unexpectedly, attempting to play");
            videoElement
              .play()
              .then(() => {
                console.log("✅ Video resumed successfully");
                consecutiveFailures = 0;
              })
              .catch((e) => {
                console.warn("Failed to resume video:", e);
                consecutiveFailures++;
              });
          }

          // Check if video has srcObject but no video data
          if (videoElement.srcObject && videoElement.readyState < 2) {
            console.log(
              "🎥 Video has srcObject but no data, checking track state"
            );

            // Check if track is still valid and not muted
            if (
              hostVideoTrack &&
              !hostVideoTrack.isMuted &&
              hostVideoTrack.mediaStreamTrack
            ) {
              console.log("🎥 Re-attaching video track");
              try {
                hostVideoTrack.detach(videoElement);
                // Small delay to ensure proper cleanup
                setTimeout(() => {
                  hostVideoTrack.attach(videoElement);
                  console.log("✅ Video track re-attached");
                }, 100);
              } catch (e) {
                console.warn("Failed to re-attach video track:", e);
                consecutiveFailures++;
              }
            } else {
              console.warn("🎥 Video track is muted or invalid");
              consecutiveFailures++;
            }
          }

          // If we have too many consecutive failures, try to force a complete re-attach
          if (consecutiveFailures >= maxFailures) {
            console.warn(
              "🎥 Too many consecutive failures, forcing complete re-attach"
            );
            try {
              hostVideoTrack.detach(videoElement);
              setTimeout(() => {
                hostVideoTrack.attach(videoElement);
                consecutiveFailures = 0;
              }, 500);
            } catch (e) {
              console.error("Failed to force re-attach:", e);
            }
          }
        };

        // More frequent health checks for the first 30 seconds
        const healthCheckInterval = setInterval(checkVideoHealth, 2000);

        // Reduce frequency after initial period
        const reduceFrequencyTimeout = setTimeout(() => {
          clearInterval(healthCheckInterval);
          const slowHealthCheckInterval = setInterval(checkVideoHealth, 10000);

          return () => {
            clearInterval(slowHealthCheckInterval);
          };
        }, 30000);

        return () => {
          console.log("🎥 Detaching host video track from video element");

          clearInterval(healthCheckInterval);
          clearTimeout(reduceFrequencyTimeout);

          // Remove event listeners
          videoElement.removeEventListener("loadstart", handleLoadStart);
          videoElement.removeEventListener("loadeddata", handleLoadedData);
          videoElement.removeEventListener("canplay", handleCanPlay);
          videoElement.removeEventListener("error", handleError);
          videoElement.removeEventListener("ended", handleEnded);
          videoElement.removeEventListener("stalled", handleStalled);
          videoElement.removeEventListener("suspend", handleSuspend);
          videoElement.removeEventListener("waiting", handleWaiting);
          videoElement.removeEventListener("play", handlePlay);
          videoElement.removeEventListener("pause", handlePause);

          // Detach the track
          try {
            hostVideoTrack.detach(videoElement);
            console.log("✅ Video track detached successfully");
          } catch (error) {
            console.error("❌ Failed to detach video track:", error);
          }
        };
      }
    }, [hostVideoTrack]);

    // Ensure datafeed script loads only once per app session
    useEffect(() => {
      if (typeof window === "undefined") return;
      // @ts-expect-error custom global
      if (window.__tvUdfLoaded) {
        setIsScriptReady(true);
      }
    }, []);

    const widgetProps = useMemo(
      (): Partial<ChartingLibraryWidgetOptions> => ({
        symbol: symbol,
        interval: "1D" as ResolutionString,
        library_path: "/static/charting_library/",
        locale: "en" as LanguageCode,
        charts_storage_url: "https://saveload.tradingview.com",
        charts_storage_api_version: "1.1" as const,
        client_id: "tradingview.com",
        user_id: "public_user_id",
        fullscreen: false,
        autosize: true,
        disabled_features: isHost
          ? ["use_localstorage_for_settings"]
          : [
              "use_localstorage_for_settings",
              "left_toolbar",
              "header_widget",
              "header_compare",
              "header_undo_redo",
              "header_screenshot",
              "header_fullscreen_button",
              "header_settings",
              "header_indicators",
              "header_chart_type",
              "header_symbol_search",
              "header_resolutions",
              "header_saveload",
              "timeframes_toolbar",
              "control_bar",
            ],
      }),
      [symbol, isHost]
    );

    const handleScriptReady = useCallback(() => {
      // Mark as loaded globally to avoid re-injecting on remounts
      try {
        // @ts-expect-error custom global
        window.__tvUdfLoaded = true;
      } catch {}
      setIsScriptReady(true);
    }, []);

    // Helper: compute min size for container to encourage correct layer
    const minSizeClass = useMemo(() => {
      // Use high quality sizing since participants can't control quality
      return "min-w-[1280px] min-h-[850px]";
    }, []);

    // Show video stream for participants when host is streaming
    if (!isHost && isHostStreaming && hostVideoTrack) {
      return (
        <div
          data-testid="trading-view-chart-stream"
          className={`w-full h-full relative ${minSizeClass}`}
        >
          <div className="absolute inset-0 bg-black" />
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain absolute inset-0 ${minSizeClass}`}
            onLoadStart={() => console.log("🎥 Video load started")}
            onLoadedData={() => console.log("🎥 Video data loaded")}
            onCanPlay={() => console.log("🎥 Video can play")}
            onError={(e) => console.error("🎥 Video error:", e)}
            onStalled={() => console.log("🎥 Video stalled")}
            onSuspend={() => console.log("🎥 Video suspended")}
            onWaiting={() => console.log("🎥 Video waiting")}
            onPlay={() => console.log("🎥 Video playing")}
            onPause={() => console.log("🎥 Video paused")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "black",
            }}
          />
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            <Video className="h-3 w-3" />
            <span>Host Chart Stream</span>
          </div>

          {/* Quality selection removed - only host controls quality */}
        </div>
      );
    }

    // Show "Host not streaming" message for participants
    if (!isHost && !isHostStreaming) {
      return (
        <div
          data-testid="trading-view-chart-waiting"
          className="w-full h-full flex items-center justify-center bg-background border border-border"
        >
          <div className="text-center">
            <VideoOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Host Not Streaming
            </h3>
            <p className="text-sm text-muted-foreground">
              Waiting for host to start chart streaming...
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">
                Checking for video stream...
              </p>
            </div>
            {streamingError && (
              <p className="text-xs text-red-500 mt-2">
                Error: {streamingError}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Show normal TradingView chart for host
    return (
      <div data-testid="trading-view-chart" className="w-full h-full">
        {/* Inject datafeed bundle only once */}
        {!isScriptReady && (
          <Script
            id="tv-udf-script"
            src="/static/datafeeds/udf/dist/bundle.js"
            strategy="afterInteractive"
            onReady={handleScriptReady}
          />
        )}
        {isScriptReady && <TradingViewChart {...widgetProps} />}
      </div>
    );
  }
);

TradingViewChartComponent.displayName = "TradingViewChartComponent";
