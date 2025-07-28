// No changes needed in this file.
// The ChartContainer within this component will benefit from its parent having position: relative.
"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import React, { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint, InstrumentData } from "./market-data";

interface DetailedInstrumentChartProps {
  instrument: InstrumentData;
}

interface CandlestickProps {
  x: number;
  width: number;
  payload: ChartDataPoint;
  yAxis?: {
    scale: (value: number) => number;
  };
  fill: string;
  y?: number;
  height?: number;
}

// Custom Candlestick Shape Component
const Candlestick = (props: CandlestickProps) => {
  const { x, width, payload, yAxis, fill } = props;

  if (
    !payload ||
    typeof payload.open === "undefined" ||
    typeof payload.close === "undefined" ||
    typeof payload.high === "undefined" ||
    typeof payload.low === "undefined"
  ) {
    return null;
  }

  if (!yAxis || typeof yAxis.scale !== "function") {
    const { y = 0, height = 0 } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(0.5, height)}
        fill={fill}
      />
    );
  }

  const { open, high, low, close } = payload as ChartDataPoint;
  const wickX = x + width / 2;
  const yHigh = yAxis.scale(high);
  const yLow = yAxis.scale(low);
  const yOpen = yAxis.scale(open);
  const yClose = yAxis.scale(close);
  const bodyY = Math.min(yOpen, yClose);
  const bodyHeight = Math.abs(yOpen - yClose);

  return (
    <g>
      <line
        x1={wickX}
        y1={yHigh}
        x2={wickX}
        y2={yLow}
        stroke={fill}
        strokeWidth={1}
      />
      <rect
        x={x}
        y={bodyY}
        width={width}
        height={Math.max(0.5, bodyHeight)}
        fill={fill}
      />
    </g>
  );
};

export function DetailedInstrumentChart({
  instrument,
}: DetailedInstrumentChartProps) {
  const chartData = useMemo(
    () => instrument.chartData || [],
    [instrument.chartData]
  );

  const chartConfig = useMemo(
    () => ({
      value: { label: instrument.name },
    }),
    [instrument.name]
  ) satisfies ChartConfig;

  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 1];
    const lows = chartData
      .map((p) => p.low)
      .filter((v) => typeof v === "number");
    const highs = chartData
      .map((p) => p.high)
      .filter((v) => typeof v === "number");
    if (lows.length === 0 || highs.length === 0) return [0, 1];

    let minVal = Math.min(...lows);
    let maxVal = Math.max(...highs);
    const diff = maxVal - minVal;
    const padding =
      diff === 0 ? (minVal === 0 ? 0.1 : Math.abs(minVal * 0.1)) : diff * 0.15;

    minVal -= padding;
    maxVal += padding;
    return [minVal, maxVal];
  }, [chartData]);

  const formatYAxisTick = (value: number) => {
    return value.toFixed(instrument.type === "forex" ? 4 : 2);
  };

  const formatXAxisTick = (time: string, index: number) => {
    if (chartData.length === 0) return "";
    const entry = chartData[index];
    if (!entry || !entry.time) return "";

    if (chartData.length <= 10) return entry.time.replace("T-", "");
    if (index % Math.floor(chartData.length / 6) === 0)
      return entry.time.replace("T-", "");
    return "";
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
        Detailed chart data unavailable.
      </div>
    );
  }

  const validChartData = chartData.filter(
    (point) =>
      point &&
      typeof point.open === "number" &&
      typeof point.close === "number" &&
      typeof point.high === "number" &&
      typeof point.low === "number" &&
      typeof point.time === "string"
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full h-full flex items-center justify-center gap-4 [&>div]:flex-1"
    >
      <ComposedChart
        accessibilityLayer
        data={validChartData}
        margin={{
          top: 5,
          right: 5,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="hsl(var(--border) / 0.3)"
        />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border) / 0.5)" }}
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickFormatter={formatXAxisTick}
          padding={{ left: 5, right: 5 }}
          interval="preserveStartEnd"
        />
        <YAxis
          orientation="right"
          domain={yAxisDomain}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border) / 0.5)" }}
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickFormatter={formatYAxisTick}
          width={instrument.type === "forex" ? 55 : 50}
        />
        <ChartTooltip
          cursor={{
            stroke: "hsl(var(--accent-foreground) / 0.5)",
            strokeWidth: 1,
            strokeDasharray: "3 6",
          }}
          content={
            <ChartTooltipContent
              formatter={(value, name, props) => {
                const payload = props.payload as ChartDataPoint | undefined;
                if (!payload) return null;
                return [
                  <React.Fragment key={payload.time}>
                    <div className="font-semibold text-popover-foreground">
                      {instrument.name} ({payload.time?.replace("T-", "")})
                    </div>
                    <div className="text-muted-foreground">
                      Open:{" "}
                      {payload.open?.toFixed(
                        instrument.type === "forex" ? 4 : 2
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      High:{" "}
                      {payload.high?.toFixed(
                        instrument.type === "forex" ? 4 : 2
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      Low:{" "}
                      {payload.low?.toFixed(
                        instrument.type === "forex" ? 4 : 2
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      Close:{" "}
                      {payload.close?.toFixed(
                        instrument.type === "forex" ? 4 : 2
                      )}
                    </div>
                  </React.Fragment>,
                  null,
                ];
              }}
              itemStyle={{ padding: "2px 0" }}
              labelFormatter={() => ""}
              className="bg-popover/90 backdrop-blur-sm text-xs p-2.5 shadow-xl rounded-lg border border-border min-w-[150px]"
            />
          }
        />
        <Bar
          dataKey={(d: ChartDataPoint) => [d.open, d.close]}
          barSize={6}
          shape={(props: unknown) => (
            <Candlestick {...(props as CandlestickProps)} />
          )}
        >
          {validChartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.close >= entry.open
                  ? "hsl(var(--chart-green))"
                  : "hsl(var(--chart-red))"
              }
            />
          ))}
        </Bar>
        <Line
          dataKey="high"
          stroke="transparent"
          dot={false}
          activeDot={false}
        />
        <Line
          dataKey="low"
          stroke="transparent"
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
