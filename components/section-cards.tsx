import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface StatCardProps {
  title: string;
  value: string | number;
  trend: {
    value: number;
    isPositive: boolean;
  };
  description: string;
  subDescription: string;
  color?:
    | "blue"
    | "green"
    | "purple"
    | "orange"
    | "violet"
    | "rose"
    | "fuchsia"
    | "cyan"
    | "red"
    | "yellow";
}

export function StatCard({
  title,
  value,
  trend,
  description,
  subDescription,
  color = "blue",
}: StatCardProps) {
  const Icon = trend.isPositive ? IconTrendingUp : IconTrendingDown;
  const trendValue = trend.isPositive ? `+${trend.value}%` : `-${trend.value}%`;

  const gradientClasses = {
    blue: "from-blue-500/15 to-card",
    green: "from-green-500/15 to-card",
    purple: "from-purple-500/15 to-card",
    orange: "from-orange-500/15 to-card",
    violet: "from-violet-500/15 to-card",
    rose: "from-rose-500/15 to-card",
    fuchsia: "from-fuchsia-500/15 to-card",
    cyan: "from-cyan-500/15 to-card",
    red: "from-red-500/15 to-card",
    yellow: "from-yellow-500/15 to-card",
  };

  return (
    <Card
      className={`@container/card bg-gradient-to-l ${gradientClasses[color]} shadow-xs border-dotted border-2`}
    >
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <Icon />
            {trendValue}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {description} <Icon className="size-4" />
        </div>
        <div className="text-muted-foreground">{subDescription}</div>
      </CardFooter>
    </Card>
  );
}
