"use client";

import { useChartStreaming } from "@/hooks/use-chart-streaming";
import { usePositions } from "@/hooks/use-positions";
import { useTradingViewLines } from "@/hooks/use-trading-view-lines";
import { useBinanceFutures } from "@/hooks/use-binance-futures";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
} from "@/public/static/charting_library";
import { Video, VideoOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Dynamic import for TradingView chart
const TradingViewChart = dynamic(
  () => import("@/components/trading-view").then((mod) => mod.TradingViewChart),
  { ssr: false }
);

// Import the ref type
import type { TradingViewChartRef } from "@/components/trading-view";

interface TradingViewChartProps {
  symbol: string;
  isHost?: boolean;
  roomId?: string;
  hostId?: string;
}

export const TradingViewChartComponent = React.memo(
  ({ symbol, isHost = false, roomId, hostId }: TradingViewChartProps) => {
    const searchParams = useSearchParams();
    // Guard against Suspense fallback by also checking window.location directly
    const isScreenshot =
      searchParams?.get("screenshot") === "1" ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("screenshot") === "1");
    const [isScriptReady, setIsScriptReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const tradingViewRef = useRef<TradingViewChartRef>(null);
    const locale = useLocale();
    const t = useTranslations("room.windowTitleBar");

    // Get chart streaming state
    const {
      isHostStreaming,
      hostVideoTrack,
      error: streamingError,
    } = useChartStreaming(roomId || "", hostId || "");

    // Get open positions for entry lines (only for host)
    const { openPositions } = usePositions(roomId || "");

    // Debug: Log positions data
    useEffect(() => {
      console.log("🔍 Open positions from database:", {
        roomId,
        openPositionsCount: openPositions?.length || 0,
        positions:
          openPositions?.map((p) => ({
            id: p.id,
            symbol: p.symbol,
            entry_price: p.entry_price,
            side: p.side,
            opened_at: p.opened_at,
          })) || [],
      });
    }, [openPositions, roomId]);

    // Get current price for the symbol (same as trade-history-tabs.tsx approach)
    const marketData = useBinanceFutures(symbol);
    const currentPrice = marketData?.ticker?.lastPrice
      ? parseFloat(marketData.ticker.lastPrice)
      : undefined;

    // Initialize TradingView lines hook
    const { updateEntryLines, clearAllEntryLines } = useTradingViewLines({
      widgetRef: tradingViewRef,
      isReady: isScriptReady && !!tradingViewRef.current?.isReady(),
    });

    // Force update entry lines when positions change (more aggressive approach)
    useEffect(() => {
      if (!isHost || !isScriptReady || !openPositions) {
        return;
      }

      // Small delay to ensure TradingView is ready
      const timeoutId = setTimeout(async () => {
        const symbolPositions = openPositions.filter(
          (position) => position.symbol === symbol
        );

        if (symbolPositions.length > 0) {
          await updateEntryLines(
            symbolPositions.map((position) => {
              // Calculate PnL percentage exactly like in trade-history-tabs.tsx
              let pnlPercentage = 0;
              if (currentPrice) {
                const entry = Number(position.entry_price);
                const side = (position.side ?? "").toLowerCase();
                const pnlPercent =
                  side === "long"
                    ? ((currentPrice - entry) / entry) * 100
                    : ((entry - currentPrice) / entry) * 100;

                // Use the exact same calculation as trade-history-tabs.tsx
                pnlPercentage = pnlPercent;
              }

              return {
                id: position.id,
                entry_price: position.entry_price,
                side: position.side,
                created_at: position.opened_at || new Date().toISOString(),
                pnl_percentage: pnlPercentage,
              };
            })
          );
        } else {
          // If no positions for this symbol, clear all lines
          clearAllEntryLines();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [
      openPositions,
      symbol,
      isHost,
      isScriptReady,
      currentPrice,
      updateEntryLines,
      clearAllEntryLines,
    ]);

    // Attach video track to video element with robust error handling
    useEffect(() => {
      if (hostVideoTrack && videoRef.current) {
        const videoElement = videoRef.current;

        // Configure video element for screen sharing
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.controls = false;
        videoElement.setAttribute("playsinline", "true");
        videoElement.setAttribute("webkit-playsinline", "true");
        videoElement.setAttribute("x-webkit-airplay", "allow");
        videoElement.setAttribute("x5-video-player-type", "h5");
        videoElement.setAttribute("x5-video-player-fullscreen", "true");

        // Set video styling for screen sharing
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "contain";
        videoElement.style.backgroundColor = "transparent";
        videoElement.style.display = "block";
        videoElement.style.visibility = "visible";
        videoElement.style.opacity = "1";
        videoElement.style.zIndex = "1";

        // Add essential event listeners
        const handleCanPlay = () => {
          console.log("Video can play - attempting to play");
          videoElement.play().catch(() => {});
        };
        const handleLoadedData = () => {
          console.log("Video data loaded - attempting to play");
          videoElement.play().catch(() => {});
        };
        const handleError = (e: Event) => {
          // Suppress LiveKit client disconnect errors as they are expected
          const errorEvent = e as ErrorEvent;
          const errorMessage =
            errorEvent?.message || (errorEvent?.error as Error)?.message || "";
          if (
            errorMessage.includes("Client initiated disconnect") ||
            errorMessage.includes("ConnectionError") ||
            errorMessage.includes("CLIENT_DISCONNECTED")
          ) {
            // These are expected disconnection errors, don't log them
            return;
          }
          console.error("Video error:", e);
        };

        videoElement.addEventListener("canplay", handleCanPlay);
        videoElement.addEventListener("loadeddata", handleLoadedData);
        videoElement.addEventListener("error", handleError);

        // Attach the track with proper screen sharing setup
        try {
          // Ensure the video element is ready
          videoElement.load();

          // Attach the track
          hostVideoTrack.attach(videoElement);

          // Force play with multiple attempts for screen sharing
          const attemptPlay = () => {
            videoElement
              .play()
              .then(() => {
                // Success - video is playing
              })
              .catch((error) => {
                // Try again after a short delay
                setTimeout(attemptPlay, 200);
              });
          };

          // Start playing after a short delay
          setTimeout(attemptPlay, 100);
        } catch (error) {
          // Suppress LiveKit client disconnect errors as they are expected
          const errorMessage = (error as Error)?.message || "";
          if (
            errorMessage.includes("Client initiated disconnect") ||
            errorMessage.includes("ConnectionError") ||
            errorMessage.includes("CLIENT_DISCONNECTED")
          ) {
            // These are expected disconnection errors, don't log them
            return;
          }
          console.error("Failed to attach video track:", error);
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
          clearInterval(healthCheckInterval);
          clearTimeout(reduceFrequencyTimeout);

          // Remove event listeners
          videoElement.removeEventListener("canplay", handleCanPlay);
          videoElement.removeEventListener("loadeddata", handleLoadedData);
          videoElement.removeEventListener("error", handleError);

          // Detach the track
          try {
            hostVideoTrack.detach(videoElement);
          } catch (error) {
            // Suppress LiveKit client disconnect errors as they are expected
            const errorMessage = (error as Error)?.message || "";
            if (
              errorMessage.includes("Client initiated disconnect") ||
              errorMessage.includes("ConnectionError") ||
              errorMessage.includes("CLIENT_DISCONNECTED")
            ) {
              // These are expected disconnection errors, don't log them
              return;
            }
            console.error("Failed to detach video track:", error);
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

    // Update entry lines when positions change (only for host)
    useEffect(() => {
      console.log("🔍 Entry lines effect triggered:", {
        isHost,
        isScriptReady,
        openPositionsCount: openPositions.length,
        symbol,
        widgetReady: tradingViewRef.current?.isReady(),
      });

      if (!isHost || !isScriptReady) {
        console.log("❌ Skipping entry lines - not host or script not ready");
        return;
      }

      // Add a delay to ensure TradingView widget is fully initialized
      const timeoutId = setTimeout(() => {
        console.log("⏰ Timeout triggered, checking widget readiness...");

        if (!tradingViewRef.current?.isReady()) {
          console.warn(
            "❌ TradingView widget not ready yet, skipping entry lines update"
          );
          return;
        }

        // Filter positions for the current symbol
        const symbolPositions = openPositions.filter(
          (position) => position.symbol === symbol
        );

        console.log("📊 Symbol positions found:", {
          symbol,
          totalPositions: openPositions.length,
          symbolPositionsCount: symbolPositions.length,
          allPositions: openPositions.map((p) => ({
            id: p.id,
            symbol: p.symbol,
            entry_price: p.entry_price,
            side: p.side,
          })),
          filteredPositions: symbolPositions.map((p) => ({
            id: p.id,
            entry_price: p.entry_price,
            side: p.side,
            symbol: p.symbol,
          })),
        });

        if (symbolPositions.length === 0) {
          console.log("⚠️ No positions found for symbol:", symbol);
          return;
        }

        // Update entry lines
        console.log(
          "🎯 Calling updateEntryLines with positions:",
          symbolPositions
        );
        updateEntryLines(
          symbolPositions.map((position) => ({
            id: position.id,
            entry_price: position.entry_price,
            side: position.side,
            created_at: position.opened_at || new Date().toISOString(),
          }))
        );
      }, 1000); // Wait 1 second for TradingView to fully initialize

      return () => clearTimeout(timeoutId);
    }, [openPositions, symbol, isHost, isScriptReady, updateEntryLines]);

    // Clear entry lines when symbol changes
    useEffect(() => {
      clearAllEntryLines();
    }, [symbol, clearAllEntryLines]);

    // Cleanup entry lines when component unmounts
    useEffect(() => {
      return () => {
        clearAllEntryLines();
      };
    }, [clearAllEntryLines]);

    const widgetProps = useMemo(
      (): Partial<ChartingLibraryWidgetOptions> => ({
        symbol: symbol,
        interval: "1D" as ResolutionString,
        library_path: "/static/charting_library/",
        locale: (locale === "ko" ? "ko" : "en") as LanguageCode,
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
      [symbol, isHost, locale]
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
      return "min-h-[850px]";
    }, []);

    // Show video stream for participants when host is streaming
    if (!isHost && isHostStreaming && hostVideoTrack) {
      return (
        <div
          data-testid="trading-view-chart-stream"
          className={`w-full h-full relative ${minSizeClass}`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain absolute inset-0 ${minSizeClass}`}
            onError={(e) => {
              const errorMessage =
                (e.nativeEvent as ErrorEvent)?.message ||
                ((e.nativeEvent as ErrorEvent)?.error as Error)?.message ||
                "";
              if (
                errorMessage.includes("Client initiated disconnect") ||
                errorMessage.includes("ConnectionError") ||
                errorMessage.includes("CLIENT_DISCONNECTED")
              ) {
                // These are expected disconnection errors, don't log them
                return;
              }
              console.error("Video error:", e);
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "transparent",
            }}
          />
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            <Video className="h-3 w-3" />
            <span>{t("streamStatus.hostStreamBanner")}</span>
          </div>

          {/* Quality selection removed - only host controls quality */}
        </div>
      );
    }

    // Show "Host not streaming" message for participants
    if (!isHost && !isHostStreaming && !isScreenshot) {
      return (
        <div
          data-testid="trading-view-chart-waiting"
          className="w-full h-full flex items-center justify-center bg-background border border-border"
        >
          <div className="text-center">
            <VideoOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {streamingError?.includes("Disconnected")
                ? t("streamStatus.connectionLostTitle")
                : t("streamStatus.notStreamingTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {streamingError?.includes("Disconnected")
                ? t("streamStatus.attemptingReconnect")
                : t("streamStatus.waitingForHost")}
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">
                {streamingError?.includes("Disconnected")
                  ? t("streamStatus.reconnecting")
                  : t("streamStatus.checkingForStream")}
              </p>
            </div>
            {streamingError && (
              <div className="mt-2">
                <p className="text-xs text-red-500">
                  {t("streamStatus.errorPrefix")} {streamingError}
                </p>
                {streamingError.includes("Disconnected") && (
                  <p className="text-xs text-blue-500 mt-1">
                    {t("streamStatus.disconnectedHint")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Removed overlay badges – label is attached to the TradingView line

    // Show normal TradingView chart for host
    return (
      <div data-testid="trading-view-chart" className="w-full h-full relative">
        {/* Inject datafeed bundle only once */}
        {!isScriptReady && (
          <Script
            id="tv-udf-script"
            src="/static/datafeeds/udf/dist/bundle.js"
            strategy="afterInteractive"
            onReady={handleScriptReady}
          />
        )}
        {isScriptReady && (
          <>
            <TradingViewChart ref={tradingViewRef} {...widgetProps} />
          </>
        )}
      </div>
    );
  }
);

TradingViewChartComponent.displayName = "TradingViewChartComponent";
