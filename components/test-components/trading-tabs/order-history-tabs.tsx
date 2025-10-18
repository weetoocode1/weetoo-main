import { useOrderHistory } from "@/hooks/use-order-history";
import { createClient } from "@/lib/supabase/client";
import type { Symbol } from "@/types/market";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SimpleTable } from "./shared/simple-table";

interface RealtimePayload {
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
}

interface OrderHistoryItem {
  date: string;
  time: string;
  symbol: string;
  type: string;
  side: string;
  price: string;
  amount: string;
  totalValue: string;
  fee: string;
  status: string;
  pnl?: number;
  leverage: number;
  closePrice?: number;
  id: string;
  pnlFormatted: string;
  pnlColor: string;
}

interface OrderHistoryTabsProps {
  symbol?: Symbol;
  roomId?: string;
  onCountChange?: (count: number) => void;
}

export function OrderHistoryTabs({
  symbol,
  roomId,
  onCountChange,
}: OrderHistoryTabsProps) {
  const [filters] = useState({
    symbol: undefined as string | undefined,
    side: undefined as string | undefined,
    type: undefined as string | undefined,
    status: undefined as string | undefined,
    limit: 50, // Larger chunk size for better initial load
  });

  // Use infinite scrolling hook
  const {
    data: orderHistory,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    loadNextPage,
    refetch,
    totalCount,
  } = useOrderHistory({
    roomId: roomId || "",
    filters,
    enabled: !!roomId,
    staleTime: 2 * 60 * 1000, // 2 minutes for order history
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Realtime: update instantly when a position closes
  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("history-updates-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_room_positions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePayload) => {
          const wasOpen = payload.old?.closed_at == null;
          const nowClosed = payload.new?.closed_at != null;
          if (wasOpen && nowClosed) {
            refetch();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, refetch]);

  // Define columns for the table
  const columns = [
    "Date",
    "Time",
    "Symbol",
    "Type",
    "Side",
    "Price",
    "Amount",
    "Total Value",
    "Fee",
    "Status",
  ] as const;

  // Transform data for SimpleTable component
  const tableData = useMemo(() => {
    if (!orderHistory) return [];

    return orderHistory.map((item: OrderHistoryItem) => ({
      Date: item.date,
      Time: item.time,
      Symbol: item.symbol,
      Type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
      Side:
        item.side.toLowerCase().startsWith("long") ||
        item.side.toLowerCase().startsWith("buy")
          ? "Buy"
          : "Sell",
      Price: item.price,
      Amount: item.amount,
      "Total Value": item.totalValue,
      Fee: item.fee,
      Status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    }));
  }, [orderHistory]);

  // Handle filter changes with debouncing
  // const handleFilterChange = useCallback(
  //   (filterType: string, value: string) => {
  //     setFilters((prev) => ({
  //       ...prev,
  //       [filterType]: value === "all" ? undefined : value,
  //       offset: 0, // Reset pagination when filters change
  //     }));
  //   },
  //   []
  // );

  // Handle row click
  const handleRowClick = useCallback((row: Record<string, unknown>) => {
    console.log("Order history row clicked:", row);
    // TODO: Implement order details modal or navigation
  }, []);

  // Auto-load more data when scrolling near bottom
  useEffect(() => {
    const handleScroll = () => {
      const tableContainer = document.querySelector(".overflow-y-auto");
      if (!tableContainer || !hasNextPage || isFetchingNextPage) return;

      const { scrollTop, scrollHeight, clientHeight } = tableContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200; // 200px threshold

      if (isNearBottom) {
        loadNextPage();
      }
    };

    const tableContainer = document.querySelector(".overflow-y-auto");
    if (tableContainer) {
      tableContainer.addEventListener("scroll", handleScroll);
      return () => tableContainer.removeEventListener("scroll", handleScroll);
    }
  }, [hasNextPage, isFetchingNextPage, loadNextPage]);

  // Auto-load more data immediately if there's more available
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && orderHistory.length > 0) {
      // Small delay to ensure UI is rendered
      const timer = setTimeout(() => {
        loadNextPage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasNextPage, isFetchingNextPage, orderHistory.length, loadNextPage]);

  // Notify parent about total count
  useEffect(() => {
    if (typeof totalCount === "number" && onCountChange) {
      onCountChange(totalCount);
    }
  }, [totalCount, onCountChange]);

  // Error state
  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-red-600 mb-2">
            Failed to load order history
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Remove skeletons; show table immediately (possibly empty) while data streams in

  return (
    <div className="h-full flex flex-col">
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading order history...
          </div>
        </div>
      )}

      {/* Table with optimized props */}
      <div className="flex-1 overflow-hidden">
        <SimpleTable
          columns={columns}
          data={tableData}
          emptyStateText="No Order History Found"
          onRowClick={handleRowClick}
          widenMatchers={["Symbol", "Total Value"]}
          narrowMatchers={["Status", "Fee", "Type"]}
          showFilters={true}
          filterableColumns={["Symbol", "Side", "Type", "Status"]}
        />
      </div>
    </div>
  );
}
