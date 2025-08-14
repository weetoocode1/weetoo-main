"use client";

import { DateRangePicker } from "@/components/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DownloadIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { ActivityPointsTable } from "./activity-points-table";

export function ActivityPointsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    activityType: "all",
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
  });

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { from: range?.from, to: range?.to },
    }));
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      activityType: "all",
      dateRange: {
        from: undefined,
        to: undefined,
      },
    });
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((value) => {
    if (typeof value === "object" && value !== null) {
      // Handle dateRange object
      return value.from || value.to;
    }
    return value !== "all";
  }).length;

  return (
    <div className="container mx-auto space-y-4 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border mt-5">
        <div className="space-y-1 mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Activity Points
          </h1>
          <p className="text-muted-foreground text-sm">
            View all the acitivity points transactions on the platform
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full justify-between">
        <div className="relative w-full">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activity points..."
            className="pl-9 shadow-none h-10 border border-border w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={handleDateRangeChange}
          />

          <Select
            value={filters.activityType}
            onValueChange={(value) => handleFilterChange("activityType", value)}
          >
            <SelectTrigger className="shadow-none h-10 cursor-pointer w-full sm:w-[200px]">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activities</SelectItem>
              <SelectItem value="post_create">Post Creation</SelectItem>
              <SelectItem value="comment_add">Comment</SelectItem>
              <SelectItem value="post_like">Like</SelectItem>
              <SelectItem value="post_share">Share</SelectItem>
              <SelectItem value="welcome_bonus">Welcome Bonus</SelectItem>
              <SelectItem value="daily_login">Daily Login</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="default"
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
            className="h-10 px-4 font-normal shadow-none cursor-pointer w-full sm:w-auto"
          >
            Clear Filters
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shadow-none h-10 cursor-pointer w-full sm:w-10"
          >
            <DownloadIcon className="h-4 w-4" />
            <span className="sr-only">Export</span>
          </Button>
        </div>
      </div>

      <ActivityPointsTable searchTerm={searchTerm} filters={filters} />
    </div>
  );
}
