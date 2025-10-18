import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

interface OrderHistoryItem {
  id: string;
  date: string;
  time: string;
  symbol: string;
  type: string;
  side: string;
  price: number;
  amount: number;
  totalValue: string;
  fee: number;
  status: string;
  pnl?: number;
  leverage: number;
  closePrice?: number;
}

interface OrderHistoryResponse {
  data: OrderHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
    nextOffset: number | null;
  };
  filters: {
    symbol?: string;
    side?: string;
    type?: string;
    status?: string;
  };
  meta: {
    loadedAt: string;
    requestTime: number;
  };
}

interface InfiniteOrderHistoryResponse {
  pages: OrderHistoryResponse[];
  pageParams: number[];
}

interface OrderHistoryFilters {
  symbol?: string;
  side?: string;
  type?: string;
  status?: string;
  limit?: number;
}

interface UseOrderHistoryOptions {
  roomId: string;
  filters?: OrderHistoryFilters;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

// Query key factory for consistent caching
const orderHistoryKeys = {
  all: ["orderHistory"] as const,
  byRoom: (roomId: string) =>
    [...orderHistoryKeys.all, "room", roomId] as const,
  byRoomAndFilters: (roomId: string, filters: OrderHistoryFilters) =>
    [...orderHistoryKeys.byRoom(roomId), "filters", filters] as const,
};

// Optimized fetch function for infinite scrolling
const fetchOrderHistoryPage = async (
  roomId: string,
  filters: OrderHistoryFilters = {},
  pageParam: number = 0
): Promise<OrderHistoryResponse> => {
  const searchParams = new URLSearchParams();

  // Only add non-empty filters to reduce cache fragmentation
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  // Add pagination parameters
  const limit = filters.limit || 50;
  const offset = pageParam * limit;
  searchParams.set("limit", String(limit));
  searchParams.set("offset", String(offset));

  const url = `/api/trading-room/${roomId}/order-history?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "default",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch order history: ${response.statusText}`);
  }

  return response.json();
};

export const useOrderHistory = ({
  roomId,
  filters = {},
  enabled = true,
  staleTime = 2 * 60 * 1000, // 2 minutes for order history
  gcTime = 5 * 60 * 1000, // 5 minutes cache
}: UseOrderHistoryOptions) => {
  const queryClient = useQueryClient();

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(
    () => filters,
    [filters.symbol, filters.side, filters.type, filters.status, filters.limit]
  );

  const queryKey = orderHistoryKeys.byRoomAndFilters(roomId, memoizedFilters);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) =>
      fetchOrderHistoryPage(roomId, memoizedFilters, pageParam as number),
    enabled: enabled && !!roomId,
    staleTime,
    gcTime,
    initialPageParam: 0,
    // Infinite query specific options
    getNextPageParam: (lastPage: OrderHistoryResponse) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage
        : undefined;
    },
    getPreviousPageParam: (firstPage: OrderHistoryResponse) => {
      return firstPage.pagination.currentPage > 1
        ? firstPage.pagination.currentPage - 1
        : undefined;
    },
    // Optimize network requests
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    // Error handling
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("4")) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Load next page for infinite scrolling
  const loadNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  // Invalidate and refetch with new filters
  const refetchWithFilters = useCallback(
    (newFilters: OrderHistoryFilters) => {
      queryClient.invalidateQueries({
        queryKey: orderHistoryKeys.byRoom(roomId),
      });
    },
    [queryClient, roomId]
  );

  // Direct refetch function for reload button
  const refetch = useCallback(() => {
    return query.refetch();
  }, [query.refetch]);

  // Flatten all pages data for infinite scrolling
  const processedData = useMemo(() => {
    if (!query.data?.pages) return [];

    const allItems = query.data.pages.flatMap(
      (page: OrderHistoryResponse) => page.data
    );

    return allItems.map((item: OrderHistoryItem) => ({
      ...item,
      // Format numbers for display
      price: Number(item.price).toFixed(2),
      amount: Number(item.amount).toFixed(8),
      fee: Number(item.fee).toFixed(2),
      totalValue: Number(item.totalValue).toFixed(2),
      // Format PnL with color indication
      pnlFormatted: item.pnl
        ? `${item.pnl >= 0 ? "+" : ""}${Number(item.pnl).toFixed(2)}`
        : "0.00",
      pnlColor: item.pnl
        ? item.pnl >= 0
          ? "text-profit"
          : "text-loss"
        : "text-muted-foreground",
    }));
  }, [query.data?.pages]);

  // Memoized unique values for filters
  const uniqueValues = useMemo(() => {
    if (!query.data?.pages)
      return { symbols: [], sides: [], types: [], statuses: [] };

    const allItems = query.data.pages.flatMap(
      (page: OrderHistoryResponse) => page.data
    );
    const symbols = [
      ...new Set(allItems.map((item: OrderHistoryItem) => item.symbol)),
    ].sort();
    const sides = [
      ...new Set(allItems.map((item: OrderHistoryItem) => item.side)),
    ].sort();
    const types = [
      ...new Set(allItems.map((item: OrderHistoryItem) => item.type)),
    ].sort();
    const statuses = [
      ...new Set(allItems.map((item: OrderHistoryItem) => item.status)),
    ].sort();

    return { symbols, sides, types, statuses };
  }, [query.data?.pages]);

  return {
    // Core query data
    data: processedData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,

    // Infinite scrolling
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    loadNextPage,

    // Total count from API (first page) or fallback to current loaded length
    totalCount:
      (query.data?.pages?.[0]?.pagination?.total as number | undefined) ??
      processedData.length,

    // Filters
    currentFilters: query.data?.pages?.[0]?.filters || {},
    uniqueValues,

    // Actions
    refetch,
    refetchWithFilters,

    // Query state
    isStale: query.isStale,
    isRefetching: query.isRefetching,
  };
};

// Hook for invalidating order history cache
export const useOrderHistoryInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateOrderHistory = useCallback(
    (roomId: string) => {
      queryClient.invalidateQueries({
        queryKey: orderHistoryKeys.byRoom(roomId),
      });
    },
    [queryClient]
  );

  const invalidateAllOrderHistory = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orderHistoryKeys.all,
    });
  }, [queryClient]);

  return {
    invalidateOrderHistory,
    invalidateAllOrderHistory,
  };
};
