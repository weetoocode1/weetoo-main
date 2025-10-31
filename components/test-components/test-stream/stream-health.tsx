"use client";

import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Activity, AlertCircle } from "lucide-react";
import { useStreamHealth } from "@/hooks/use-stream-health";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

interface StreamHealthProps {
  streamId?: string;
  isOnline?: boolean;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; dataKey?: string }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length && payload[0]?.value !== undefined) {
    return (
      <div className="rounded-lg bg-zinc-900 text-white p-3 shadow-lg">
        <div className="text-xs font-medium mb-1">Drift:</div>
        <div className="text-sm font-semibold">
          {payload[0].value.toFixed(2)}ms
        </div>
      </div>
    );
  }
  return null;
};

const getHealthStatus = (health: string, t: (key: string) => string) => {
  switch (health) {
    case "excellent":
      return {
        label: t("labels.excellent"),
        headingLabel: t("labels.excellent"),
        color: "success",
        icon: Activity,
        chartColor: "var(--color-emerald-500)",
      };
    case "good":
      return {
        label: t("labels.good"),
        headingLabel: t("labels.good"),
        color: "success",
        icon: Activity,
        chartColor: "var(--color-sky-500)",
      };
    case "poor":
      return {
        label: t("labels.poor"),
        headingLabel: t("labels.poor"),
        color: "destructive",
        icon: AlertCircle,
        chartColor: "var(--color-red-500)",
      };
    case "idle":
      return {
        label: t("labels.idle"),
        headingLabel: t("labels.notStreaming"),
        color: "secondary",
        icon: AlertCircle,
        chartColor: "var(--color-zinc-400)",
      };
    default:
      return {
        label: t("labels.unknown"),
        headingLabel: t("labels.unknown"),
        color: "secondary",
        icon: AlertCircle,
        chartColor: "var(--color-zinc-400)",
      };
  }
};

export function StreamHealth({ streamId, isOnline }: StreamHealthProps) {
  const t = useTranslations("stream.health");
  const { health, isLoading } = useStreamHealth(streamId, isOnline);
  const [chartDataPoints, setChartDataPoints] = useState<
    Array<{ timestamp: string; driftAvg: number }>
  >([]);

  const healthInfo = getHealthStatus(health.status, t);
  const HealthIcon = healthInfo.icon;
  const chartStroke = healthInfo.chartColor;

  useEffect(() => {
    if (health.status === "idle") {
      setChartDataPoints([]);
      return;
    }

    if (isLoading || (health.driftAvg === 0 && health.status === "unknown")) {
      return;
    }

    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    const timestamp = `${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${roundedMinutes.toString().padStart(2, "0")}`;

    setChartDataPoints((prev) => {
      const existingIndex = prev.findIndex((dp) => dp.timestamp === timestamp);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { timestamp, driftAvg: health.driftAvg };
        return updated;
      }

      const newData = [...prev, { timestamp, driftAvg: health.driftAvg }];
      if (newData.length > 7) {
        return newData.slice(-7);
      }
      return newData;
    });
  }, [health.driftAvg, health.status, isLoading]);

  useEffect(() => {
    if (!streamId) {
      setChartDataPoints([]);
    }
  }, [streamId]);

  const xTicks = (() => {
    const ticks: string[] = [];
    const now = new Date();
    for (let i = 30; i >= 0; i -= 5) {
      const t = new Date(now.getTime() - i * 60_000);
      const hh = t.getHours().toString().padStart(2, "0");
      const mm = t.getMinutes().toString().padStart(2, "0");
      ticks.push(`${hh}:${mm}`);
    }
    return ticks;
  })();

  const chartData = xTicks.map((t) => {
    const dataPoint = chartDataPoints.find((dp) => dp.timestamp === t);
    return {
      timestamp: t,
      driftAvg: dataPoint ? dataPoint.driftAvg : 0,
    };
  });

  return (
    <div className="flex items-center flex-col w-full p-4">
      {/* Stats Section */}
      <div className="w-full mb-2">
        <div className="text-xs font-medium text-muted-foreground tracking-wide">{t("title")}</div>
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold">{healthInfo.headingLabel}</div>
          <Badge
            variant={
              healthInfo.color as
                | "default"
                | "destructive"
                | "outline"
                | "secondary"
            }
          >
            <HealthIcon className="size-3" />
            {health.driftAvg.toFixed(0)}ms {t("drift")}
          </Badge>
        </div>
        {health.status === "idle" && (
          <div className="text-sm text-muted-foreground">{t("messages.appearWhenActive")}</div>
        )}
        {health.status === "unknown" && isOnline && (
          <div className="text-sm text-muted-foreground">{t("messages.collecting")}</div>
        )}
      </div>

      {/* Chart */}
      <div className="relative w-full">
        <ChartContainer
          config={{
            driftAvg: {
              label: t("legend.driftAvg"),
              color: chartStroke,
            },
          }}
          className="h-[350px] w-full ps-1.5 pe-2.5 overflow-visible"
        >
          <ComposedChart
            data={chartData}
            margin={{
              top: 25,
              right: 25,
              left: 0,
              bottom: 25,
            }}
          >
            <defs>
              <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartStroke} stopOpacity={0.15} />
                <stop offset="100%" stopColor={chartStroke} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 12"
              stroke="var(--input)"
              strokeOpacity={1}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              ticks={xTicks}
              axisLine
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickMargin={12}
            />

            <YAxis
              axisLine
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={(value) => `${value}ms`}
              domain={[0, "dataMax + 50"]}
            />

            <ChartTooltip content={<CustomTooltip />} cursor={false} />

            <Area
              type="linear"
              dataKey="driftAvg"
              stroke="transparent"
              fill="url(#driftGradient)"
              strokeWidth={0}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="linear"
              dataKey="driftAvg"
              stroke={chartStroke}
              strokeWidth={3}
              dot={{
                r: 6,
                fill: chartStroke,
                stroke: "white",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
