"use client";

import useSWR from "swr";
import {
  RelativePerformanceChart,
  PerformanceData,
} from "./relative-performance-chart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RelativePerformanceChartClient() {
  const { data, isLoading, error } = useSWR<PerformanceData[]>(
    "/api/performance-data",
    fetcher,
    { refreshInterval: 10000 }
  );

  if (isLoading) return <div className="h-96 w-full bg-muted rounded-lg" />;
  if (error) return <div>Error loading performance data</div>;
  if (!data) return null;

  return <RelativePerformanceChart data={data} />;
}
