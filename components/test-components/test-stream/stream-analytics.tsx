"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { useStreamAnalytics } from "@/hooks/use-stream-analytics";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

type MetricKey = "concurrent" | "views" | "avgView" | "rebuffer";

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return n.toLocaleString();
  return n.toString();
}

export function StreamAnalytics({
  streamId,
  isOnline,
}: {
  streamId?: string;
  isOnline?: boolean;
}) {
  const { data } = useStreamAnalytics(streamId, isOnline);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("concurrent");

  const cards = useMemo(() => {
    return [
      {
        key: "concurrent" as MetricKey,
        title: "Concurrent Viewers",
        value: data?.concurrentViewers ?? 0,
        positive: true,
        prefix: "",
        suffix: "",
      },
      {
        key: "views" as MetricKey,
        title: "Views",
        value: data?.views ?? 0,
        positive: true,
        prefix: "",
        suffix: "",
      },
      {
        key: "avgView" as MetricKey,
        title: "Average View",
        value: data?.averageViewDuration ?? 0,
        positive: true,
        prefix: "",
        suffix: "",
        format: (v: number) => `${Math.floor(v / 60)}m ${Math.floor(v % 60)}s`,
      },
      {
        key: "rebuffer" as MetricKey,
        title: "Rebuffering %",
        value: data?.rebufferingPercentage ?? 0,
        positive: true,
        prefix: "",
        suffix: "%",
        format: (v: number) => `${v.toFixed(2)}%`,
      },
    ];
  }, [data]);

  const series = useMemo(() => {
    return (
      data?.series?.[activeMetric as keyof typeof data.series] ||
      ([] as Array<{ timestamp: string; value: number }>)
    );
  }, [data, activeMetric]);

  // Build X ticks (always show time ticks even if no data)
  const xTicks = useMemo(() => {
    if (series.length > 0) {
      const unique = Array.from(
        new Set(series.map((d) => d.timestamp).filter(Boolean))
      );
      const step = Math.max(1, Math.floor(unique.length / 6));
      return unique.filter((_, i) => i % step === 0);
    }
    const ticks: string[] = [];
    const now = new Date();
    for (let i = 30; i >= 0; i -= 5) {
      const t = new Date(now.getTime() - i * 60_000);
      const hh = t.getHours().toString().padStart(2, "0");
      const mm = t.getMinutes().toString().padStart(2, "0");
      ticks.push(`${hh}:${mm}`);
    }
    return ticks;
  }, [series]);

  // Y axis domain/ticks per metric
  const { yDomain, yTicks, yFormatter } = useMemo(() => {
    const values = series.map((d) => Number(d.value || 0));
    const maxVal = values.length ? Math.max(...values) : 0;

    if (activeMetric === "rebuffer") {
      return {
        yDomain: [0, 100],
        yTicks: [0, 25, 50, 75, 100],
        yFormatter: (v: number) => `${v}%`,
      };
    }
    if (activeMetric === "avgView") {
      const top = Math.max(60, Math.ceil((maxVal || 0) / 30) * 30);
      const ticks = [0, top / 3, (2 * top) / 3, top];
      const fmt = (v: number) => {
        const m = Math.floor(v / 60);
        const s = Math.floor(v % 60)
          .toString()
          .padStart(2, "0");
        return `${m}m ${s}s`;
      };
      return { yDomain: [0, top], yTicks: ticks, yFormatter: fmt };
    }
    const top = Math.max(5, Math.ceil((maxVal || 0) / 5) * 5);
    const ticks = [0, top / 4, top / 2, (3 * top) / 4, top];
    return {
      yDomain: [0, top],
      yTicks: ticks,
      yFormatter: (v: number) => `${Math.round(v)}`,
    };
  }, [series, activeMetric]);

  // Chart data to ensure X axis shows even with no series points
  const chartData = useMemo(() => {
    if (series.length > 0) {
      return series.filter((p) => Boolean(p.timestamp));
    }
    // ensure unique default ticks
    const unique = Array.from(new Set(xTicks));
    return unique.map((t) => ({ timestamp: t, value: 0 }));
  }, [series, xTicks]);

  // Color per metric
  const metricColor = useMemo(() => {
    const map: Record<MetricKey, string> = {
      concurrent: "var(--color-sky-500)",
      views: "var(--color-violet-500)",
      avgView: "var(--color-amber-500)",
      rebuffer: "var(--color-red-500)",
    };
    return map[activeMetric];
  }, [activeMetric]);

  return (
    <div className="flex flex-col p-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {cards.map((stat, index) => {
          const selected = activeMetric === stat.key;
          return (
            <Card
              key={index}
              className={`w-full gap-1 cursor-pointer ${
                selected ? "border-primary" : ""
              }`}
              onClick={() => setActiveMetric(stat.key)}
            >
              <CardHeader className="border-0">
                <CardTitle className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  <span>{stat.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-medium text-foreground tracking-tight">
                    {stat.format
                      ? stat.format(stat.value)
                      : stat.prefix + formatNumber(stat.value) + stat.suffix}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Line Chart below - full width */}
      <div className="relative w-full mt-6">
        <ChartContainer
          config={{
            value: { label: "Metric", color: metricColor },
          }}
          className="h-[300px] w-full ps-1.5 pe-2.5 overflow-visible"
        >
          <ComposedChart
            data={chartData.map((d) => ({ ...d, timestamp: d.timestamp }))}
            margin={{ top: 25, right: 25, left: 0, bottom: 25 }}
          >
            <defs>
              <linearGradient
                id="analyticsGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={metricColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={metricColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 12"
              stroke="var(--input)"
              strokeOpacity={1}
              horizontal
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              ticks={xTicks}
              axisLine
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickMargin={12}
              minTickGap={16}
            />
            <YAxis
              domain={yDomain as [number, number]}
              ticks={yTicks as number[]}
              axisLine
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickMargin={12}
              tickFormatter={yFormatter as (value: number) => string}
            />
            <ChartTooltip cursor={false} />
            <Area
              type="linear"
              dataKey="value"
              stroke="transparent"
              fill="url(#analyticsGradient)"
              strokeWidth={0}
              dot={false}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={metricColor}
              strokeWidth={3}
              dot={{
                r: 4,
                fill: metricColor,
                stroke: "white",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
