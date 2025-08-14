import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StatCardSkeleton() {
  return (
    <Card className="@container/card bg-gradient-to-l from-blue-500/5 to-card shadow-xs border border-border rounded-none">
      <CardHeader>
        <CardDescription>
          <Skeleton className="h-4 w-24" />
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          <Skeleton className="h-8 w-20" />
        </CardTitle>
        <div className="flex justify-end">
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex gap-2 font-medium">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
        </div>
        <Skeleton className="h-4 w-40" />
      </CardFooter>
    </Card>
  );
}
