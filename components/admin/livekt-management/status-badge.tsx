import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "Active" | "Inactive" | "Scheduled";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    Active: {
      variant: "default" as const,
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    },
    Inactive: {
      variant: "secondary" as const,
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
    },
    Scheduled: {
      variant: "outline" as const,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    },
  };

  const config = variants[status] || variants.Inactive;

  return (
    <Badge variant={config.variant} className={config.color}>
      {status}
    </Badge>
  );
}
