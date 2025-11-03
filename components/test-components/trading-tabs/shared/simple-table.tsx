import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import React, { useState } from "react";
import { useTranslations } from "next-intl";

interface SimpleTableProps<TData = unknown> {
  // Display labels for columns (localized)
  columns: ReadonlyArray<string>;
  // Canonical data keys for each column (stable, non-localized). If omitted, falls back to columns[]
  dataKeys?: ReadonlyArray<string>;
  data: TData[];
  widenMatchers?: string[]; // columns that should be wider
  narrowMatchers?: string[]; // columns that should be narrower (e.g., Action)
  emptyStateText?: string; // custom text for empty state
  onRowClick?: (row: TData) => void; // optional row click handler
  showFilters?: boolean; // show filter controls
  // Filterable columns use canonical keys (e.g., "Symbol", "Side", "Type")
  filterableColumns?: string[]; // columns that can be filtered
}

export function SimpleTable<TData = unknown>({
  columns,
  dataKeys,
  data = [],
  widenMatchers = [],
  narrowMatchers = ["Action", "Actions"],
  emptyStateText = "No Available Data",
  onRowClick,
  showFilters = false,
  filterableColumns = ["Symbol", "Side", "Type"],
}: SimpleTableProps<TData>) {
  const t = useTranslations("trading.table");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const matchesAny = (text: string, patterns: string[]) =>
    patterns.some((p) => text.toLowerCase().includes(p.toLowerCase()));

  // Create column definitions from the column names
  // const columnHelper = createColumnHelper<TData>();

  const columnDefs: ColumnDef<TData, unknown>[] = columns.map(
    (columnName, index) => {
      const key = (dataKeys && dataKeys[index]) || columnName; // stable accessor key
      // const isWide = matchesAny(columnName, widenMatchers);
      // const isNarrow = matchesAny(columnName, narrowMatchers);
      // const widthClass = isWide
      //   ? "flex-[1.3]"
      //   : isNarrow
      //   ? "flex-[0.8]"
      //   : "flex-1";

      const sortKey = key.toLowerCase().replace(/\s+/g, "_");
      return {
        id: sortKey,
        // Use accessorFn so sorting/filtering work on actual displayed values
        accessorFn: (row: TData) => {
          const rowData = row as Record<string, unknown>;
          // Prefer exact display column key, then lowercase variant, then index-based
          const value =
            rowData[key] ??
            rowData[key.toLowerCase()] ??
            (rowData[index] as unknown);
          return value ?? "";
        },
        header: columnName,
        enableSorting: true,
        enableColumnFilter: true,
        sortingFn: (
          rowA: { getValue: (columnId: string) => unknown },
          rowB: { getValue: (columnId: string) => unknown },
          columnId: string
        ) => {
          const aValue = rowA.getValue(columnId);
          const bValue = rowB.getValue(columnId);

          // Handle numeric values
          if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
            return Number(aValue) - Number(bValue);
          }

          // Handle string values
          return String(aValue).localeCompare(String(bValue));
        },
        cell: ({ row }) => {
          const rowData = row.original as Record<string, unknown>;
          const value =
            rowData[key] ||
            rowData[key.toLowerCase()] ||
            rowData[index] ||
            "";

          // Render React elements directly (e.g., action buttons)
          if (React.isValidElement(value)) {
            return (
              <div className="flex items-center justify-center whitespace-nowrap px-1">
                {value}
              </div>
            );
          }

          const text = String(value);
          let colorClass = "";
          if (key === "Side") {
            const lower = text.toLowerCase();
            if (lower === "buy" || lower === "long")
              colorClass = "text-emerald-500";
            if (lower === "sell" || lower === "short")
              colorClass = "text-red-500";
          }
          return (
            <div className="flex items-center justify-center whitespace-nowrap px-1">
              <span className={colorClass}>{text}</span>
            </div>
          );
        },
      };
    }
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
  });

  const isEmpty = data.length === 0;
  const effectiveEmptyText = emptyStateText ?? t("empty");

  // Get unique values for filter dropdowns
  const getUniqueValues = (columnName: string) => {
    const values = data.map((row: TData) => {
      const rowData = row as Record<string, unknown>;
      const key = columnName; // filter APIs expect canonical keys
      const value = rowData[key] || rowData[key.toLowerCase()] || "";
      return String(value);
    });
    return Array.from(new Set(values)).filter(Boolean).sort();
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters([]);
  };

  // Get active filter count
  const activeFilterCount = columnFilters.length;

  // Get active filter values for display
  const getActiveFilterValue = (columnName: string) => {
    const columnId = columnName.toLowerCase().replace(/\s+/g, "_");
    const filterValue = table.getColumn(columnId)?.getFilterValue() as string;
    return filterValue && filterValue !== "" ? filterValue : null;
  };

  // Check if a filter is active
  const isFilterActive = (columnName: string) => {
    return getActiveFilterValue(columnName) !== null;
  };

  // Get filtered count for a specific column
  const getFilteredCount = (columnName: string) => {
    if (!isFilterActive(columnName)) return 0;

    const filterValue = getActiveFilterValue(columnName);
    return data.filter((row: TData) => {
      const rowData = row as Record<string, unknown>;
      const rowValue =
        rowData[columnName] || rowData[columnName.toLowerCase()] || "";
      return String(rowValue) === filterValue;
    }).length;
  };

  return (
    <div className="p-2 h-full table-sortable">
      <div
        className="h-full flex flex-col border"
        style={{ pointerEvents: "auto" }}
      >
        {/* Filter Controls */}
        {showFilters && (
          <div
            className="flex flex-col lg:flex-row items-start lg:items-center gap-2 p-2 border-b border-border bg-muted/20 table-sortable"
            style={{ pointerEvents: "auto" }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            {/* Desktop Filter Layout */}
            <div className="hidden lg:flex items-center gap-2 w-full">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  {t("filters")}:
                </span>
              </div>

              {/* Symbol Filter */}
              {filterableColumns.includes("Symbol") && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={
                      (table.getColumn("symbol")?.getFilterValue() as string) ??
                      ""
                    }
                    onValueChange={(value) =>
                      table
                        .getColumn("symbol")
                        ?.setFilterValue(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      className={`h-8 text-xs ${
                        isFilterActive("Symbol")
                          ? "w-44 border-green-300 bg-green-50 text-green-800"
                          : "w-32"
                      }`}
                    >
                      <SelectValue
                        placeholder={t("symbol")}
                        className={
                          isFilterActive("Symbol")
                            ? "text-green-800 font-semibold text-xs"
                            : ""
                        }
                      >
                        {isFilterActive("Symbol") ? (
                          <div className="flex items-center gap-1">
                            <span>{t("symbol")}:</span>
                            <span className="font-semibold text-xs">
                              {getActiveFilterValue("Symbol")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({getFilteredCount("Symbol")})
                            </span>
                          </div>
                        ) : (
                          t("symbol")
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      {t("allSymbols")}
                      </SelectItem>
                      {getUniqueValues("Symbol").map((symbol) => (
                        <SelectItem
                          key={symbol}
                          value={symbol}
                          className="text-xs"
                        >
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Side Filter */}
              {filterableColumns.includes("Side") && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={
                      (table.getColumn("side")?.getFilterValue() as string) ??
                      ""
                    }
                    onValueChange={(value) =>
                      table
                        .getColumn("side")
                        ?.setFilterValue(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      className={`h-8 text-xs ${
                        isFilterActive("Side")
                          ? "w-32 border-green-300 bg-green-50 text-green-800"
                          : "w-24"
                      }`}
                    >
                      <SelectValue
                        placeholder="Side"
                        className={
                          isFilterActive("Side")
                            ? "text-green-800 font-semibold text-xs"
                            : ""
                        }
                      >
                        {isFilterActive("Side") ? (
                          <div className="flex items-center gap-1">
                            <span>Side:</span>
                            <span className="font-semibold text-xs">
                              {getActiveFilterValue("Side")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({getFilteredCount("Side")})
                            </span>
                          </div>
                        ) : (
                          "Side"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All Sides
                      </SelectItem>
                      {getUniqueValues("Side").map((side) => (
                        <SelectItem key={side} value={side} className="text-xs">
                          {side}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Type Filter */}
              {filterableColumns.includes("Type") && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={
                      (table.getColumn("type")?.getFilterValue() as string) ??
                      ""
                    }
                    onValueChange={(value) =>
                      table
                        .getColumn("type")
                        ?.setFilterValue(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      className={`h-8 text-xs ${
                        isFilterActive("Type")
                          ? "w-36 border-green-300 bg-green-50 text-green-800"
                          : "w-24"
                      }`}
                    >
                      <SelectValue
                        placeholder="Type"
                        className={
                          isFilterActive("Type")
                            ? "text-green-800 font-semibold"
                            : ""
                        }
                      >
                        {isFilterActive("Type") ? (
                          <div className="flex items-center gap-1">
                            <span>Type:</span>
                            <span className="font-semibold">
                              {getActiveFilterValue("Type")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({getFilteredCount("Type")})
                            </span>
                          </div>
                        ) : (
                          "Type"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All Types
                      </SelectItem>
                      {getUniqueValues("Type").map((type) => (
                        <SelectItem key={type} value={type} className="text-xs">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t("clear")} ({activeFilterCount})
                  </Button>
                </div>
              )}

              {/* Spacer to push sort to the right */}
              <div className="flex-1" />

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                {/* Sort By Filter */}
                <span className="text-xs font-medium text-foreground">
                  {t("sort")}:
                </span>
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={sorting.length > 0 ? sorting[0].id : "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setSorting([]);
                      } else {
                        setSorting([{ id: value, desc: false }]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder={t("select")}/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        {t("noSorting")}
                      </SelectItem>
                      {columns.map((columnName) => {
                        // Convert column name to lowercase and replace spaces with underscores for sorting
                        const sortKey = columnName
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                        return (
                          <SelectItem
                            key={sortKey}
                            value={sortKey}
                            className="text-xs"
                          >
                            {columnName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Mobile Filter Layout */}
            <div className="flex flex-col lg:hidden w-full gap-2">
              {/* Top Row: Filter Label and Clear Button */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {t("filters")}:
                  </span>
                </div>
                {activeFilterCount > 0 && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-7 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t("clear")} ({activeFilterCount})
                    </Button>
                  </div>
                )}
              </div>

              {/* Middle Row: Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Symbol Filter */}
                {filterableColumns.includes("Symbol") && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value={
                        (table
                          .getColumn("symbol")
                          ?.getFilterValue() as string) ?? ""
                      }
                      onValueChange={(value) =>
                        table
                          .getColumn("symbol")
                          ?.setFilterValue(value === "all" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        className={`h-7 text-xs ${
                          isFilterActive("Symbol")
                            ? "w-32 border-green-300 bg-green-50 text-green-800"
                            : "w-24"
                        }`}
                      >
                        <SelectValue placeholder={t("symbol")} />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        {t("allSymbols")}
                        </SelectItem>
                        {getUniqueValues("Symbol").map((symbol) => (
                          <SelectItem
                            key={symbol}
                            value={symbol}
                            className="text-xs"
                          >
                            {symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Side Filter */}
                {filterableColumns.includes("Side") && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value={
                        (table.getColumn("side")?.getFilterValue() as string) ??
                        ""
                      }
                      onValueChange={(value) =>
                        table
                          .getColumn("side")
                          ?.setFilterValue(value === "all" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        className={`h-7 text-xs ${
                          isFilterActive("Side")
                            ? "w-24 border-green-300 bg-green-50 text-green-800"
                            : "w-20"
                        }`}
                      >
                        <SelectValue placeholder={t("side")} />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        {t("allSides")}
                        </SelectItem>
                        {getUniqueValues("Side").map((side) => (
                          <SelectItem
                            key={side}
                            value={side}
                            className="text-xs"
                          >
                            {side}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Type Filter */}
                {filterableColumns.includes("Type") && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value={
                        (table.getColumn("type")?.getFilterValue() as string) ??
                        ""
                      }
                      onValueChange={(value) =>
                        table
                          .getColumn("type")
                          ?.setFilterValue(value === "all" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        className={`h-7 text-xs ${
                          isFilterActive("Type")
                            ? "w-28 border-green-300 bg-green-50 text-green-800"
                            : "w-20"
                        }`}
                      >
                        <SelectValue placeholder={t("type")} />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        {t("allTypes")}
                        </SelectItem>
                        {getUniqueValues("Type").map((type) => (
                          <SelectItem
                            key={type}
                            value={type}
                            className="text-xs"
                          >
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Bottom Row: Sort Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {t("sort")}:
                </span>
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={sorting.length > 0 ? sorting[0].id : "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setSorting([]);
                      } else {
                        setSorting([{ id: value, desc: false }]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        {t("noSorting")}
                      </SelectItem>
                      {columns.map((columnName) => {
                        // Convert column name to lowercase and replace spaces with underscores for sorting
                        const sortKey = columnName
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                        return (
                          <SelectItem
                            key={sortKey}
                            value={sortKey}
                            className="text-xs"
                          >
                            {columnName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Desktop Header */}
        <div
          className="hidden lg:flex items-center px-2 py-3 text-xs text-muted-foreground border-b border-border bg-muted/30"
          style={{ pointerEvents: "auto" }}
        >
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => {
              const headerLabel = String(
                header.column.columnDef.header ?? header.id
              );
              const isWide = matchesAny(headerLabel, widenMatchers);
              const isNarrow = matchesAny(headerLabel, narrowMatchers);
              const widthClass = isWide
                ? "flex-[1.3]"
                : isNarrow
                ? "flex-[0.8]"
                : "flex-1";

              return (
                <div
                  key={header.id}
                  className={`flex items-center justify-center whitespace-nowrap px-1 text-center ${widthClass} ${
                    header.column.getCanSort()
                      ? "cursor-pointer select-none hover:text-foreground"
                      : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    header.column.getToggleSortingHandler()?.(e);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="flex items-center gap-1 justify-center">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanSort() && (
                      <span className="text-xs">
                        {header.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Header */}
        <div
          className="lg:hidden flex items-center px-2 py-2 text-xs text-muted-foreground border-b border-border bg-muted/30 overflow-x-auto scrollbar-none"
          style={{ pointerEvents: "auto" }}
        >
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => {
              const headerLabel = String(
                header.column.columnDef.header ?? header.id
              );
              const isWide = matchesAny(headerLabel, widenMatchers);
              const isNarrow = matchesAny(headerLabel, narrowMatchers);
              const widthClass = isWide
                ? "flex-[1.3] min-w-[120px]"
                : isNarrow
                ? "flex-[0.8] min-w-[80px]"
                : "flex-1 min-w-[100px]";

              return (
                <div
                  key={header.id}
                  className={`flex items-center justify-center whitespace-nowrap px-1 text-center ${widthClass} flex-shrink-0 ${
                    header.column.getCanSort()
                      ? "cursor-pointer select-none hover:text-foreground"
                      : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    header.column.getToggleSortingHandler()?.(e);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="flex items-center gap-1 justify-center">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanSort() && (
                      <span className="text-xs">
                        {header.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Body */}
        <div
          className="hidden lg:flex flex-1 overflow-y-auto h-[500px]"
          style={{ pointerEvents: "auto" }}
        >
          {isEmpty ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center text-muted-foreground">
                <div className="w-20 h-20 mx-auto flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-muted-foreground/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium">{effectiveEmptyText}</p>
              </div>
            </div>
          ) : (
            <div className="w-full">
              {table.getRowModel().rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-center px-2 py-2 text-xs border-b border-border/50 hover:bg-muted/20 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      return;
                    }
                    e.stopPropagation();
                    onRowClick?.(row.original);
                  }}
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const columnName = columns[cellIndex];
                    const isWide = matchesAny(columnName, widenMatchers);
                    const isNarrow = matchesAny(columnName, narrowMatchers);
                    const widthClass = isWide
                      ? "flex-[1.3]"
                      : isNarrow
                      ? "flex-[0.8]"
                      : "flex-1";

                    return (
                      <div
                        key={cell.id}
                        className={`${widthClass} flex items-center justify-center`}
                        onMouseDown={(e) => {
                          const target = e.target as HTMLElement;
                          const isButton = target.closest('button[data-grid-no-drag="true"]');
                          if (isButton) {
                            e.stopPropagation();
                            e.preventDefault();
                          }
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Body */}
        <div
          className="lg:hidden flex-1 overflow-y-auto h-[400px]"
          style={{ pointerEvents: "auto" }}
        >
          {isEmpty ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-muted-foreground/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium">{effectiveEmptyText}</p>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              {table.getRowModel().rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-center px-2 py-2 text-xs border-b border-border/50 hover:bg-muted/20 transition-colors min-w-max ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      return;
                    }
                    e.stopPropagation();
                    onRowClick?.(row.original);
                  }}
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button[data-grid-no-drag="true"]');
                    if (isButton) {
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const columnName = columns[cellIndex];
                    const isWide = matchesAny(columnName, widenMatchers);
                    const isNarrow = matchesAny(columnName, narrowMatchers);
                    const widthClass = isWide
                      ? "flex-[1.3] min-w-[120px]"
                      : isNarrow
                      ? "flex-[0.8] min-w-[80px]"
                      : "flex-1 min-w-[100px]";

                    return (
                      <div
                        key={cell.id}
                        className={`${widthClass} flex items-center justify-center flex-shrink-0`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
