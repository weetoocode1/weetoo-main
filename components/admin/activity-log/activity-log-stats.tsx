import { StatCard } from "@/components/section-cards";

export function ActivityLogStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Activities"
        value="142"
        trend={{ value: 12.5, isPositive: true }}
        description="Trending up this month"
        subDescription="Total activities increasing"
        color="blue"
      />

      <StatCard
        title="Content Actions"
        value="87"
        trend={{ value: 12.5, isPositive: true }}
        description="of total activities"
        subDescription="Content actions increasing"
        color="green"
      />

      <StatCard
        title="User Management"
        value="38"
        trend={{ value: 12.5, isPositive: true }}
        description="of total activities"
        subDescription="User management increasing"
        color="purple"
      />

      <StatCard
        title="Security Actions"
        value="17"
        trend={{ value: 12.5, isPositive: true }}
        description="of total activities"
        subDescription="Security actions increasing"
        color="orange"
      />
    </div>
  );
}
