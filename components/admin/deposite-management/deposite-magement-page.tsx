"use client";

import { DateRangePicker } from "@/components/date-range-picker";
import { StatCard } from "@/components/section-cards";
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
import { SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { DepositTable } from "./deposite-table";

export function DepositManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    paymentMethod: "all",
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
    amountRange: "all",
  });

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { from: range?.from, to: range?.to },
    }));
  };

  const handleFilterChange = (
    key: Exclude<keyof typeof filters, "dateRange">,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      paymentMethod: "all",
      dateRange: {
        from: undefined,
        to: undefined,
      },
      amountRange: "all",
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
    <div className="bg-background">
      <div className="space-y-6 mt-5 container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border">
          <div className="space-y-1 mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-semibold">
              Deposite Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              View and manage KOR_Coin deposit transactions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Deposits"
            value="17,000"
            trend={{ value: 12.5, isPositive: true }}
            description="Trending up this month"
            subDescription="Total deposits increasing"
            color="blue"
          />

          <StatCard
            title="Approved Deposits"
            value="1,234"
            trend={{ value: 5.2, isPositive: true }}
            description="Deposits approved this month"
            subDescription="Stable approval rate"
            color="green"
          />

          <StatCard
            title="Rejected Deposits"
            value="1,234"
            trend={{ value: 5.2, isPositive: true }}
            description="Deposits rejected this month"
            subDescription="Stable rejection rate"
            color="red"
          />

          <StatCard
            title="Deposits Pending"
            value="1,234"
            trend={{ value: 5.2, isPositive: true }}
            description="Deposits pending this month"
            subDescription="Stable pending rate"
            color="yellow"
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full justify-between">
          <div className="relative w-full md:flex-1 md:max-w-none">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deposits..."
              className="pl-9 shadow-none h-10 border border-border w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row flex-1 gap-3 md:gap-3 w-full md:w-auto">
            <DateRangePicker
              date={filters.dateRange}
              onDateChange={handleDateRangeChange}
              className="w-full md:w-auto"
            />

            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger className="shadow-none h-10 cursor-pointer w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.paymentMethod}
              onValueChange={(value) =>
                handleFilterChange("paymentMethod", value)
              }
            >
              <SelectTrigger className="shadow-none h-10 cursor-pointer w-full md:w-[200px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.amountRange}
              onValueChange={(value) =>
                handleFilterChange("amountRange", value)
              }
            >
              <SelectTrigger className="shadow-none h-10 cursor-pointer w-full md:w-[200px]">
                <SelectValue placeholder="Amount Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All amounts</SelectItem>
                <SelectItem value="0-100000">0 - 100,000 KOR</SelectItem>
                <SelectItem value="100000-500000">
                  100,000 - 500,000 KOR
                </SelectItem>
                <SelectItem value="500000-1000000">
                  500,000 - 1,000,000 KOR
                </SelectItem>
                <SelectItem value="1000000+">1,000,000+ KOR</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="default"
              className="shadow-none cursor-pointer h-10 w-full md:w-auto"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.status !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Status: {filters.status}
                <XIcon
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange("status", "all")}
                />
              </Badge>
            )}
            {filters.paymentMethod !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Method: {filters.paymentMethod}
                <XIcon
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange("paymentMethod", "all")}
                />
              </Badge>
            )}
            {filters.amountRange !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Amount: {filters.amountRange}
                <XIcon
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange("amountRange", "all")}
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
                    handleDateRangeChange({
                      ...filters.dateRange,
                      to: undefined,
                    })
                  }
                />
              </Badge>
            )}
          </div>
        )}

        <DepositTable searchTerm={searchTerm} filters={filters} />
      </div>
    </div>
  );
}
