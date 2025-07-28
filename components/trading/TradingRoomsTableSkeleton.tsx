import { Skeleton } from "@/components/ui/skeleton";

const columns = [
  "Room",
  "Creator",
  "P&L %",
  "Participants",
  "Type",
  "Access",
  "Created",
  "",
];

export function TradingRoomsTableSkeleton() {
  return (
    <div className="bg-background overflow-x-auto rounded-md border">
      <table className="table-fixed min-w-[800px]">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className="h-11 pl-5 text-left font-semibold text-sm text-muted-foreground"
              >
                {col || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, i) => (
            <tr key={i} className="h-16">
              {columns.map((_, j) => (
                <td key={j} className="pl-5 py-5">
                  <Skeleton className="h-6 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
