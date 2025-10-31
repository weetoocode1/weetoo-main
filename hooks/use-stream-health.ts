"use client";

import { useState, useEffect } from "react";

interface StreamHealthData {
  health: string;
  status: string;
  driftAvg: number;
  driftDeviation: number;
}

export function useStreamHealth(streamId?: string, isOnline?: boolean) {
  const [health, setHealth] = useState<StreamHealthData>({
    health: "unknown",
    status: "unknown",
    driftAvg: 0,
    driftDeviation: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchHealth = async () => {
      if (!streamId || !isOnline) {
        setHealth({
          health: "idle",
          status: "idle",
          driftAvg: 0,
          driftDeviation: 0,
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/streams/${streamId}/health`);

        if (response.ok) {
          const data = await response.json();
          setHealth(data);
        } else {
          console.error("Failed to fetch stream health:", response.statusText);
          setHealth({
            health: "unknown",
            status: "unknown",
            driftAvg: 0,
            driftDeviation: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stream health:", error);
        setHealth({
          health: "unknown",
          status: "unknown",
          driftAvg: 0,
          driftDeviation: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealth();

    if (isOnline) {
      interval = setInterval(fetchHealth, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [streamId, isOnline]);

  return { health, isLoading };
}
