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
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "../../ui/chart";

interface UsagePatternChartProps {
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

export function UsagePatternChart({ data }: UsagePatternChartProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="font-semibold">LiveKit Usage Patterns</CardTitle>
        <CardDescription>
          Broadcasting and listening time by hour of day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="broadcasting"
              type="monotone"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Broadcasting (min)"
            />
            <Line
              dataKey="listening"
              type="monotone"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Listening (min)"
            />
            <ChartLegend className="mt-10" content={<ChartLegendContent />} />
          </LineChart>
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
