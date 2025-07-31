"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import {
  RelativePerformanceChart,
  PerformanceData,
} from "./relative-performance-chart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RelativePerformanceChartClient() {
  const t = useTranslations("comprehensiveData");
  const { data, isLoading, error } = useSWR<PerformanceData[]>(
    "/api/performance-data",
    fetcher,
    { refreshInterval: 10000 }
  );

  if (isLoading) return <div className="h-96 w-full bg-muted rounded-lg" />;
  if (error) return <div>{t("errorLoadingPerformanceData")}</div>;
  if (!data) return null;

  return <RelativePerformanceChart data={data} />;
}
