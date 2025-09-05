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

    // Attach video track to video element with no remote constraints
    useEffect(() => {
      if (hostVideoTrack && videoRef.current) {
        console.log("🎥 Attaching host video track to video element");

        // Attach the track
        hostVideoTrack.attach(videoRef.current);

        // Configure video element for better quality
        const videoElement = videoRef.current;
        videoElement.muted = true; // Ensure muted to prevent audio issues
        videoElement.playsInline = true; // Important for mobile
        videoElement.autoplay = true;

        // Set video quality attributes
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "contain";

        return () => {
          console.log("🎥 Detaching host video track from video element");
          hostVideoTrack.detach(videoRef.current!);
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
