import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartDataPoint } from "@/types";
import { TrendingUpIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../../ui/chart";

interface DayOfWeekChartProps {
  data: ChartDataPoint[];
}

const chartConfig = {
  broadcasting: {
    label: "Broadcasting (min)",
    color: "#f97316",
  },
  listening: {
    label: "Listening (min)",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="font-medium">Usage by Day of Week</CardTitle>
        <CardDescription>
          Broadcasting vs listening distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar
              dataKey="broadcasting"
              fill="#f97316"
              radius={4}
              name="Broadcasting (min)"
            />
            <Bar
              dataKey="listening"
              fill="#3b82f6"
              radius={4}
              name="Listening (min)"
            />
            <ChartLegend className="mt-10" content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t border-border">
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Trending up by 5.2% this month{" "}
              <TrendingUpIcon className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Showing total visitors for the last 6 months
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
