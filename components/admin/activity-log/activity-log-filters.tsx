"use client";

import { ChevronDown, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

interface Filters {
  dateRange: { from: Date | undefined; to: Date | undefined };
  selectedAdmins: string[];
  selectedActions: string[];
}

interface ActivityLogFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function ActivityLogFilters({
  filters,
  onFiltersChange,
}: ActivityLogFiltersProps) {
  const admins = [
    { id: "admin_1", name: "Sarah Johnson" },
    { id: "admin_2", name: "David Wilson" },
    { id: "admin_3", name: "Alex Rodriguez" },
  ];

  const actions = [
    { id: "post_approval", name: "Post Approval" },
    { id: "user_update", name: "User Update" },
    { id: "content_removal", name: "Content Removal" },
    { id: "system_settings", name: "System Settings" },
    { id: "user_ban", name: "User Ban" },
  ];

  const toggleAdmin = (adminId: string) => {
    const newSelectedAdmins = filters.selectedAdmins.includes(adminId)
      ? filters.selectedAdmins.filter((id) => id !== adminId)
      : [...filters.selectedAdmins, adminId];

    onFiltersChange({
      ...filters,
      selectedAdmins: newSelectedAdmins,
    });
  };

  const toggleAction = (actionId: string) => {
    const newSelectedActions = filters.selectedActions.includes(actionId)
      ? filters.selectedActions.filter((id) => id !== actionId)
      : [...filters.selectedActions, actionId];

    onFiltersChange({
      ...filters,
      selectedActions: newSelectedActions,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      selectedAdmins: [],
      selectedActions: [],
    });
  };

  const setDateRange = (
    dateRange: { from: Date | undefined; to: Date | undefined } | undefined
  ) => {
    onFiltersChange({
      ...filters,
      dateRange: dateRange || { from: undefined, to: undefined },
    });
  };

  const formatDateRange = () => {
    if (!filters.dateRange.from) return "All time";
    if (!filters.dateRange.to)
      return `Since ${filters.dateRange.from.toLocaleDateString()}`;
    return `${filters.dateRange.from.toLocaleDateString()} - ${filters.dateRange.to.toLocaleDateString()}`;
  };

  const hasActiveFilters =
    filters.dateRange.from ||
    filters.selectedAdmins.length > 0 ||
    filters.selectedActions.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 min-w-[200px] justify-start h-10"
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="truncate">{formatDateRange()}</span>
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Calendar
            mode="range"
            defaultMonth={filters.dateRange.from}
            selected={{
              from: filters.dateRange.from,
              to: filters.dateRange.to,
            }}
            onSelect={(range) =>
              setDateRange(
                range as
                  | { from: Date | undefined; to: Date | undefined }
                  | undefined
              )
            }
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Admin Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-10">
            Admin
            {filters.selectedAdmins.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {filters.selectedAdmins.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by admin</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {admins.map((admin) => (
            <DropdownMenuCheckboxItem
              key={admin.id}
              checked={filters.selectedAdmins.includes(admin.id)}
              onCheckedChange={() => toggleAdmin(admin.id)}
            >
              {admin.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Action Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-10">
            Action
            {filters.selectedActions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {filters.selectedActions.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by action</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuCheckboxItem
              key={action.id}
              checked={filters.selectedActions.includes(action.id)}
              onCheckedChange={() => toggleAction(action.id)}
            >
              {action.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
