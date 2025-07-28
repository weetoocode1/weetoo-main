import { StatCard } from "@/components/section-cards";

export function UserStats() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Users"
        value="17,000"
        trend={{ value: 12.5, isPositive: true }}
        description="Trending up this month"
        subDescription="Total users increasing"
        color="blue"
      />
      <StatCard
        title="New Users"
        value="1,234"
        trend={{ value: 20, isPositive: false }}
        description="Down 20% this period"
        subDescription="New users increasing"
        color="green"
      />
      <StatCard
        title="Active Users"
        value="1000"
        trend={{ value: 12.5, isPositive: true }}
        description="Trending up this month"
        subDescription="Active users increasing"
        color="purple"
      />
      <StatCard
        title="Inactive Users"
        value="500"
        trend={{ value: 4.5, isPositive: false }}
        description="Down 4.5% this period"
        subDescription="Inactive users decreasing"
        color="red"
      />
    </div>
  );
}
