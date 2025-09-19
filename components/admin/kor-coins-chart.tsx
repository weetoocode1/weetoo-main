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
import { useTranslations } from "next-intl";

const chartConfig = {
  coins: {
    label: "coins",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function KorCoinsChart() {
  const { data: chartData, isLoading } = useChartData();
  const t = useTranslations("admin.overview.charts.korCoins");

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
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
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
  const totalDailyActivity = korCoinsData.reduce(
    (sum, day) => sum + day.coins,
    0
  );
  const localizedConfig = {
    coins: { ...chartConfig.coins, label: t("series.coins") },
  } as ChartConfig;

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
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex">
            <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
              <span className="text-muted-foreground text-xs">
                {t("monthlyActivity")}
              </span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {totalDailyActivity.toLocaleString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={localizedConfig}
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="coins"
                fill={localizedConfig.coins.color}
                radius={[0, 0, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
