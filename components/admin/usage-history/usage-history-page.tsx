"use client";

import { format } from "date-fns";
import { DownloadIcon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "../../date-range-picker";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { UsageHistoryTable } from "./usage-history-table";

export function UsageHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    usageType: "all",
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
  });

  type FilterValue = string | { from: Date | undefined; to: Date | undefined };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((value) => {
    if (typeof value === "object" && value !== null) {
      // Handle dateRange object
      return value.from || value.to;
    }
    return value !== "all";
  }).length;

  const handleFilterChange = (key: string, value: FilterValue) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: range
        ? { from: range.from, to: range.to }
        : { from: undefined, to: undefined },
    }));
  };

  const clearFilters = () => {
    setFilters({
      usageType: "all",
      dateRange: {
        from: undefined,
        to: undefined,
      },
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search usage history..."
            className="pl-9 w-full h-10 shadow-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={handleDateRangeChange}
          />
          <Select
            value={filters.usageType}
            onValueChange={(value) =>
              handleFilterChange("usageType", value as FilterValue)
            }
          >
            <SelectTrigger className="w-full sm:w-[230px] h-10 shadow-none cursor-pointer">
              <SelectValue placeholder="Usage Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="donation">Donation</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="premium">Premium Content</SelectItem>
              <SelectItem value="service">Service Fee</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <Button
              size="default"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
              className="h-10 px-4 font-normal shadow-none cursor-pointer"
            >
              Clear Filters
            </Button>
            <Button
              variant="outline"
              className="shadow-none cursor-pointer h-10"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="sr-only">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.usageType !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Usage Type: {filters.usageType}
              <XIcon
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleFilterChange("usageType", "all")}
              />
            </Badge>
          )}
          {filters.dateRange.from && (
            <Badge variant="secondary" className="text-xs">
              From: {format(filters.dateRange.from, "PP")}
              <XIcon
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() =>
                  handleDateRangeChange({
                    ...filters.dateRange,
                    from: undefined,
                  })
                }
              />
            </Badge>
          )}
          {filters.dateRange.to && (
            <Badge variant="secondary" className="text-xs">
              To: {format(filters.dateRange.to, "PP")}
              <XIcon
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() =>
                  handleDateRangeChange({ ...filters.dateRange, to: undefined })
                }
              />
            </Badge>
          )}
        </div>
      )}
      <UsageHistoryTable searchTerm={searchTerm} filters={filters} />
    </>
  );
}
