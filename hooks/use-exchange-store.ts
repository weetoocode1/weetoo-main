import { EXCHANGES, type Exchange } from "@/components/exchange/exchanges-data";
import { useEffect, useState } from "react";

// Global state for exchanges
let globalExchanges: Exchange[] = EXCHANGES;
let listeners: (() => void)[] = [];

// Function to update exchanges globally
export const updateExchanges = (newExchanges: Exchange[]) => {
  globalExchanges = newExchanges;
  // Notify all listeners
  listeners.forEach((listener) => listener());
};

// Function to get current exchanges
export const getExchanges = () => globalExchanges;

// Hook to use exchanges with automatic updates
export const useExchangeStore = () => {
  const [exchanges, setExchanges] = useState<Exchange[]>(globalExchanges);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const response = await fetch("/api/exchanges");
        if (response.ok) {
          const data = await response.json();
          const fetchedExchanges = data.exchanges;
          setExchanges(fetchedExchanges);
          globalExchanges = fetchedExchanges;
        } else {
          console.error("Failed to fetch exchanges");
          setExchanges(EXCHANGES);
          globalExchanges = EXCHANGES;
        }
      } catch (error) {
        console.error("Error fetching exchanges:", error);
        setExchanges(EXCHANGES);
        globalExchanges = EXCHANGES;
      } finally {
        setLoading(false);
      }
    };

    fetchExchanges();

    // Add listener for updates
    const listener = () => {
      setExchanges(globalExchanges);
    };
    listeners.push(listener);

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return { exchanges, loading, setExchanges };
};
