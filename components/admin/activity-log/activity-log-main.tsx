"use client";

import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { ActivityLogFilters } from "./activity-log-filters";
import { ActivityLogStats } from "./activity-log-stats";
import { ActivityLogTable } from "./activity-log-table";

export function ActivityLogMain() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
    selectedAdmins: [] as string[],
    selectedActions: [] as string[],
  });
  return (
    <div className="container mx-auto space-y-5">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-6 border-b border-border mt-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Activity Log</h1>
          <p className="text-muted-foreground">
            Track and monitor all administrative actions across the platform
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <ActivityLogStats />

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-[500px]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <ActivityLogFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Activity Table */}
      <ActivityLogTable searchQuery={searchQuery} filters={filters} />
    </div>
  );
}
