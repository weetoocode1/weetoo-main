"use client";

import { useEffect, useState } from "react";

export interface AnalyticsSeriesPoint {
  timestamp: string;
  value: number;
}

export interface StreamAnalyticsData {
  concurrentViewers: number;
  views: number;
  averageViewDuration: number; // seconds
  rebufferingPercentage: number; // percentage 0-100
  series: {
    concurrent: AnalyticsSeriesPoint[];
    views: AnalyticsSeriesPoint[];
    avgView: AnalyticsSeriesPoint[];
    rebuffer: AnalyticsSeriesPoint[];
  };
}

export function useStreamAnalytics(streamId?: string, isOnline?: boolean) {
  const [data, setData] = useState<StreamAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchAnalytics = async () => {
      if (!streamId) {
        setData(null);
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const [analyticsRes, engagementRes] = await Promise.allSettled([
          fetch(`/api/streams/${streamId}/analytics`).then(async (r) => ({
            ok: r.ok,
            json: await r.json(),
          })),
          fetch(`/api/streams/${streamId}/engagement`).then(async (r) => ({
            ok: r.ok,
            json: await r.json(),
          })),
        ]);

        let base: StreamAnalyticsData | null = null;
        if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
          base = analyticsRes.value.json as StreamAnalyticsData;
        }

        if (base) {
          // Merge real-time counts from engagement if available
          if (engagementRes.status === "fulfilled" && engagementRes.value.ok) {
            const { concurrent, views } = engagementRes.value.json as {
              concurrent?: number;
              views?: number;
            };
            base = {
              ...base,
              concurrentViewers:
                typeof concurrent === "number"
                  ? concurrent
                  : base.concurrentViewers,
              views: typeof views === "number" ? views : base.views,
            };
          }
          setData(base);
        }
      } catch (e) {
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
    interval = setInterval(fetchAnalytics, isOnline ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [streamId, isOnline]);

  return { data, isLoading };
}
