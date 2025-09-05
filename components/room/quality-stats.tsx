"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QualityStatsProps {
  stats: {
    codec?: string;
    layer?: string;
    bitrate?: number;
    resolution?: string;
    frameRate?: number;
  };
  isVisible: boolean;
  onToggle: () => void;
  onRefresh?: () => void;
  onForceHigh?: () => void;
}

export function QualityStats({
  stats,
  isVisible,
  onToggle,
  onRefresh,
  onForceHigh,
}: QualityStatsProps) {
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-black/80 text-white px-3 py-1 rounded text-xs hover:bg-black/90"
      >
        Show Stats
      </button>
    );
  }

  const formatBitrate = (bitrate?: number) => {
    if (!bitrate) return "N/A";
    if (bitrate > 1000000) return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    if (bitrate > 1000) return `${(bitrate / 1000).toFixed(0)} Kbps`;
    return `${bitrate} bps`;
  };

  const getQualityColor = (layer?: string) => {
    switch (layer?.toLowerCase()) {
      case "high":
      case "h":
        return "text-green-400";
      case "medium":
      case "m":
        return "text-yellow-400";
      case "low":
      case "l":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-64 bg-black/90 text-white border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex justify-between items-center">
          Stream Quality
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white text-xs"
          >
            ×
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Resolution:</span>
          <span>{stats.resolution || "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Codec:</span>
          <span className="text-blue-400">{stats.codec || "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Layer:</span>
          <span className={getQualityColor(stats.layer)}>
            {stats.layer || "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Bitrate:</span>
          <span className="text-green-400">{formatBitrate(stats.bitrate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">FPS:</span>
          <span>{stats.frameRate || "N/A"}</span>
        </div>
        <div className="pt-2 border-t border-gray-700">
          <div className="text-gray-400 text-xs">
            {stats.bitrate && stats.bitrate < 2000000 && (
              <span className="text-yellow-400">⚠️ Low bitrate detected</span>
            )}
            {stats.codec === "vp8" && (
              <span className="text-orange-400">
                ⚠️ Using VP8 (VP9 preferred)
              </span>
            )}
            {stats.resolution === "N/A" && (
              <span className="text-red-400">⚠️ No video element found</span>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                const videos = document.querySelectorAll("video");
                console.log("Found video elements:", videos.length);
                videos.forEach((video, i) => {
                  console.log(`Video ${i}:`, {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    src: video.src,
                    srcObject: video.srcObject,
                    className: video.className,
                    dataset: video.dataset,
                  });
                });
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Debug
            </button>
            <button
              onClick={() => {
                if (onRefresh) {
                  onRefresh();
                } else {
                  window.location.reload();
                }
              }}
              className="text-xs text-green-400 hover:text-green-300"
            >
              Refresh
            </button>
            {onForceHigh && (
              <button
                onClick={onForceHigh}
                className="text-xs text-yellow-400 hover:text-yellow-300"
              >
                Force High
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
