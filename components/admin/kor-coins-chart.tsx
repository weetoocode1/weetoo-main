"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useChartData } from "@/hooks/use-chart-data";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  coins: {
    label: "KOR Coins",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function KorCoinsChart() {
  const { data: chartData, isLoading } = useChartData();

  if (isLoading) {
    return (
      <div className="relative">
        <Card className="py-0 border border-border rounded-none shadow-none">
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

          <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
              <CardTitle>KOR Coins Activity</CardTitle>
              <CardDescription>
                Showing daily KOR Coins usage for the last 30 days
              </CardDescription>
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const korCoinsData = chartData?.korCoinsActivity || [];
  const latestCoins = korCoinsData[korCoinsData.length - 1]?.coins || 0;

  return (
    <div className="relative">
      <Card className="py-0 border border-border rounded-none shadow-none">
        {/* Corner borders */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <CardTitle>KOR Coins Activity</CardTitle>
            <CardDescription>
              Showing daily KOR Coins usage for the last 30 days
            </CardDescription>
          </div>
          <div className="flex">
            <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
              <span className="text-muted-foreground text-xs">
                {chartConfig.coins.label}
              </span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {latestCoins.toLocaleString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <BarChart
              data={korCoinsData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  return value.toLocaleString();
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="coins"
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                  />
                }
              />
              <Bar
                dataKey="coins"
                fill={chartConfig.coins.color}
                radius={[0, 0, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
