"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "An area chart with a legend";

const chartData = [
  {
    month: "January",
    deposits: 1860,
    withdrawals: 800,
    activityPoints: 500,
    usageAmount: 1200,
  },
  {
    month: "February",
    deposits: 2000,
    withdrawals: 900,
    activityPoints: 550,
    usageAmount: 1300,
  },
  {
    month: "March",
    deposits: 1900,
    withdrawals: 850,
    activityPoints: 520,
    usageAmount: 1250,
  },
  {
    month: "April",
    deposits: 2100,
    withdrawals: 950,
    activityPoints: 600,
    usageAmount: 1400,
  },
  {
    month: "May",
    deposits: 2200,
    withdrawals: 1000,
    activityPoints: 650,
    usageAmount: 1500,
  },
  {
    month: "June",
    deposits: 2300,
    withdrawals: 1050,
    activityPoints: 700,
    usageAmount: 1600,
  },
];

const chartConfig = {
  deposits: {
    label: "Deposits",
    color: "var(--chart-1)",
  },
  withdrawals: {
    label: "Withdrawals",
    color: "var(--chart-2)",
  },
  activityPoints: {
    label: "Activity Points",
    color: "var(--chart-3)",
  },
  usageAmount: {
    label: "Usage Amount",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function KorCoinsChart() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>KOR_Coin Activities</CardTitle>
        <CardDescription>
          This chart displays deposits, withdrawals, activity points, and usage
          amounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="deposits"
              type="natural"
              fill="var(--chart-1)"
              fillOpacity={0.4}
              stroke="var(--chart-1)"
              stackId="a"
            />
            <Area
              dataKey="withdrawals"
              type="natural"
              fill="var(--chart-2)"
              fillOpacity={0.4}
              stroke="var(--chart-2)"
              stackId="a"
            />
            <Area
              dataKey="activityPoints"
              type="natural"
              fill="var(--chart-3)"
              fillOpacity={0.4}
              stroke="var(--chart-3)"
              stackId="a"
            />
            <Area
              dataKey="usageAmount"
              type="natural"
              fill="var(--chart-4)"
              fillOpacity={0.4}
              stroke="var(--chart-4)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
