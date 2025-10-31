import { useEffect, useState } from "react";

interface LiveViewersData {
  viewers: number;
  engaged: number;
  buffering: number;
}

export function useLiveViewers(
  streamId?: string,
  isActive?: boolean,
  playbackId?: string,
  options: { videoOnly?: boolean } = {}
) {
  const [viewers, setViewers] = useState<LiveViewersData>({
    viewers: 0,
    engaged: 0,
    buffering: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const videoOnly = Boolean(options.videoOnly);
    if (!streamId || !isActive) {
      setViewers({ viewers: 0, engaged: 0, buffering: 0 });
      setIsLoading(false);
      return;
    }

    const fetchViewers = async () => {
      try {
        if (!videoOnly) {
          // Prefer Mux Data real-time engagement counts when available
          const engagementRes = await fetch(
            `/api/streams/${streamId}/engagement${
              playbackId ? `?playbackId=${encodeURIComponent(playbackId)}` : ""
            }&t=${Date.now()}`,
            { cache: "no-store" }
          );
          if (engagementRes.ok) {
            const engagement = (await engagementRes.json()) as {
              concurrent?: number;
              views?: number;
            };
            if (typeof engagement.concurrent === "number") {
              setViewers({
                viewers: engagement.concurrent,
                engaged: engagement.concurrent,
                buffering: 0,
              });
              return;
            }
          }
        }

        // Fallback to Mux Video API active_viewer_count
        const response = await fetch(
          `/api/streams/${streamId}/live-viewers?t=${Date.now()}`,
          { cache: "no-store" }
        );
        if (response.ok) {
          const data = (await response.json()) as LiveViewersData;
          setViewers(data);
        } else {
          setViewers({ viewers: 0, engaged: 0, buffering: 0 });
        }
      } catch (error) {
        console.error("Error fetching viewers:", error);
        setViewers({ viewers: 0, engaged: 0, buffering: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchViewers();

    const interval = setInterval(fetchViewers, isActive ? 10000 : 30000);

    return () => clearInterval(interval);
  }, [streamId, playbackId, isActive, options.videoOnly]);

  return { viewers: viewers.viewers, isLoading };
}
