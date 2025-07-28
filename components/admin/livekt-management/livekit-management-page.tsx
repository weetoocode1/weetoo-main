"use client";

import { Switch } from "@/components/ui/switch";
import { addDays } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

// Components
import { DateRangePicker } from "./date-range-picker";
import { DayOfWeekChart } from "./day-of-week-chart";
import { TopRoomsTable } from "./top-rooms-table";
import { TopUsersTable } from "./top-users-table";
import { UsagePatternChart } from "./usage-pattern-chart";

// Data
import { StatCard } from "@/components/section-cards";
import {
  dayOfWeekData,
  metrics,
  topRooms,
  topUsers,
  usagePatternData,
} from "./mock-data";

// Helper function to format currency
function formatCurrency(value: number, isKRW: boolean) {
  if (isKRW) {
    return `₩${value.toLocaleString()}`;
  }
  return `$${value}`;
}

export function LiveKitManagementPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 5, 1), // June 1, 2025
    to: addDays(new Date(2025, 5, 1), 29), // June 30, 2025
  });
  const [isKRW, setIsKRW] = useState(false);

  // Conversion rate (example, update as needed)
  const USD_TO_KRW = 1350;

  // Get values from metrics
  const broadcastingTime = metrics.broadcastingTime;
  const listeningTime = metrics.listeningTime;
  const totalCost = metrics.totalCost;

  // Calculate cost in KRW if needed
  const broadcastingCost = isKRW
    ? Math.round(Number(broadcastingTime.cost) * USD_TO_KRW)
    : Number(broadcastingTime.cost);
  const listeningCost = isKRW
    ? Math.round(Number(listeningTime.cost) * USD_TO_KRW)
    : Number(listeningTime.cost);
  const totalCostValue = isKRW
    ? Math.round(Number(totalCost.value) * USD_TO_KRW)
    : Number(totalCost.value);

  return (
    <div className="bg-background">
      <div className="container mx-auto space-y-5 mt-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-border gap-2 lg:gap-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">LiveKit Management</h1>
            <p className="text-muted-foreground">
              Monitor and manage your LiveKit usage
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col lg:flex-row w-full items-center gap-2 lg:gap-4">
              {/* Currency Toggle - FIXED LOGIC */}
              <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border w-full justify-center">
                <span className="text-sm font-medium">
                  {isKRW ? "KRW (₩)" : "USD ($)"}
                </span>
                <Switch
                  checked={isKRW}
                  onCheckedChange={setIsKRW}
                  className="data-[state=checked]:bg-primary dark:data-[state=checked]:bg-primary"
                />
              </div>
              {/* Date Range Picker */}
              <DateRangePicker date={date} setDate={setDate} />
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Broadcasting Time"
            value={`${broadcastingTime.value} min`}
            trend={{ value: 12.5, isPositive: true }}
            description={`Estimated cost: ${formatCurrency(
              broadcastingCost,
              isKRW
            )}`}
            subDescription="Higher rate than listening time"
            color="blue"
          />
          <StatCard
            title="Listening Time"
            value={`${listeningTime.value} min`}
            trend={{ value: 12.5, isPositive: true }}
            description={`Estimated cost: ${formatCurrency(
              listeningCost,
              isKRW
            )}`}
            subDescription="Based on LiveKit pricing"
            color="green"
          />
          <StatCard
            title="Total Cost"
            value={formatCurrency(totalCostValue, isKRW)}
            trend={{ value: 12.5, isPositive: true }}
            description={`Estimated cost: ${formatCurrency(
              totalCostValue,
              isKRW
            )}`}
            subDescription="This month's usage statistics"
            color="purple"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UsagePatternChart data={usagePatternData} />
          <DayOfWeekChart data={dayOfWeekData} />
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopUsersTable users={topUsers} isKRW={isKRW} />
          <TopRoomsTable rooms={topRooms} isKRW={isKRW} />
        </div>
      </div>
    </div>
  );
}
