import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "./currency";
import type { MetricData } from "@/types";

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  data: MetricData;
  description: string;
  colorScheme: {
    gradient: string;
    border: string;
    icon: string;
    badge: string;
    decorative: string;
  };
  isKRW: boolean;
}

export function MetricCard({
  title,
  icon: Icon,
  data,
  description,
  colorScheme,
  isKRW,
}: MetricCardProps) {
  const displayValue =
    typeof data.value === "string"
      ? data.value
      : formatCurrency(data.value, isKRW);

  return (
    <Card
      className={`relative overflow-hidden border ${colorScheme.border} ${colorScheme.gradient}`}
    >
      <div
        className={`absolute top-0 right-0 w-20 h-20 ${colorScheme.decorative} rounded-full -translate-y-10 translate-x-10`}
      ></div>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Icon className={`w-5 h-5 ${colorScheme.icon}`} />
          <Badge variant="secondary" className={`text-xs ${colorScheme.badge}`}>
            +{data.change}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-light">
          {displayValue}
          {data.unit && (
            <span className="text-lg text-muted-foreground ml-1">
              {data.unit}
            </span>
          )}
        </div>
        <p className="text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">
          Estimated cost: {formatCurrency(data.cost, isKRW)}
        </p>
        <p className="text-xs text-blue-500 dark:text-blue-400">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
