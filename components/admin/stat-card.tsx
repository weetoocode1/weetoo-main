"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

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
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  trend,
  description,
  subDescription,
  color = "blue",
  isLoading = false,
}: StatCardProps) {
  const Icon = trend.isPositive ? IconTrendingUp : IconTrendingDown;
  const trendValue = trend.isPositive ? `+${trend.value}%` : `-${trend.value}%`;

  const gradientClasses = {
    blue: "from-blue-500/5 to-card",
    green: "from-green-500/5 to-card",
    purple: "from-purple-500/5 to-card",
    orange: "from-orange-500/5 to-card",
    violet: "from-violet-500/5 to-card",
    rose: "from-rose-500/5 to-card",
    fuchsia: "from-fuchsia-500/5 to-card",
    cyan: "from-cyan-500/5 to-card",
    red: "from-red-500/5 to-card",
    yellow: "from-yellow-500/5 to-card",
  };

  return (
    <div className="relative">
      <Card
        className={`@container/card bg-gradient-to-l ${gradientClasses[color]} shadow-xs border border-border rounded-none`}
      >
        {/* Corner borders */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />
        
        <CardHeader>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Skeleton className="h-8 w-20" /> : value}
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
    </div>
  );
}
