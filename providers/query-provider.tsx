"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds - shorter for trading data
            retry: 2, // Fewer retries for faster failure
            retryDelay: (attemptIndex) =>
              Math.min(500 * 2 ** attemptIndex, 5000), // Faster retry delays
            refetchOnWindowFocus: false, // Prevent refetch on tab switch
            refetchOnMount: true, // Always refetch on mount for fresh data
            refetchOnReconnect: true, // Only refetch on network reconnect
            gcTime: 5 * 60 * 1000, // 5 minutes cache time
          },
          mutations: {
            retry: 1, // Fewer retries for mutations
            retryDelay: 1000, // 1 second retry delay
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
