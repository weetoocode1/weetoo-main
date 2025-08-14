"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { DateRangePicker } from "@/components/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ExchangeUidTable } from "./exchange-uid-table";

type Situation = "all" | "verified" | "pending" | "rejected" | "suspended";
type Exchange = "all" | "Binance" | "Coinbase" | "Kraken" | "Upbit" | "Bithumb";

interface Filters {
  situation: Situation;
  exchange: Exchange;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function ExchangeUIDPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    situation: "all",
    exchange: "all",
    dateRange: {
      from: undefined,
      to: undefined,
    },
  });

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((value) => {
    if (typeof value === "object" && value !== null) {
      // Handle dateRange object
      return value.from || value.to;
    }
    return value !== "all";
  }).length;

  const handleFilterChange = (
    key: keyof Filters,
    value: Filters[keyof Filters]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: range
        ? { from: range.from, to: range.to ?? undefined }
        : { from: undefined, to: undefined },
    }));
  };

  const clearFilters = () => {
    setFilters({
      situation: "all",
      exchange: "all",
      dateRange: {
        from: undefined,
        to: undefined,
      },
    });
  };

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
        <div className="w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exchange UIDs..."
              className="pl-9 h-10 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={handleDateRangeChange}
          />
          <Select
            value={filters.situation}
            onValueChange={(value) =>
              handleFilterChange("situation", value as Situation)
            }
          >
            <SelectTrigger className="w-full sm:w-[150px] h-10 shadow-none cursor-pointer">
              <SelectValue placeholder="Situation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All situations</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.exchange}
            onValueChange={(value) =>
              handleFilterChange("exchange", value as Exchange)
            }
          >
            <SelectTrigger className="w-full sm:w-[150px] h-10 shadow-none cursor-pointer">
              <SelectValue placeholder="Exchange" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exchanges</SelectItem>
              <SelectItem value="Binance">Binance</SelectItem>
              <SelectItem value="Coinbase">Coinbase</SelectItem>
              <SelectItem value="Kraken">Kraken</SelectItem>
              <SelectItem value="Upbit">Upbit</SelectItem>
              <SelectItem value="Bithumb">Bithumb</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto h-10 shadow-none"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.situation !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Situation: {filters.situation}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleFilterChange("situation", "all")}
              />
            </Badge>
          )}
          {filters.exchange !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Exchange: {filters.exchange}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleFilterChange("exchange", "all")}
              />
            </Badge>
          )}
          {filters.dateRange.from && (
            <Badge variant="secondary" className="text-xs">
              From: {format(filters.dateRange.from, "PP")}
              <X
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
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() =>
                  handleDateRangeChange({ ...filters.dateRange, to: undefined })
                }
              />
            </Badge>
          )}
        </div>
      )}

      <ExchangeUidTable searchTerm={searchTerm} filters={filters} />
    </div>
  );
}
