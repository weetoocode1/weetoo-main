import { useEffect, useRef, useState } from "react";

interface UseAutoThumbnailProps {
  roomId: string;
  isActive: boolean;
  intervalMs?: number;
}

export function useAutoThumbnail({
  roomId,
  isActive,
  intervalMs = 120000, // 2 minutes (much better than 30 seconds)
}: UseAutoThumbnailProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const [hasCustomThumbnail, setHasCustomThumbnail] = useState(false);

  // Check for custom thumbnail
  useEffect(() => {
    const checkCustomThumbnail = async () => {
      try {
        const response = await fetch(`/api/room-thumbnail?roomId=${roomId}`);
        if (response.ok) {
          const data = await response.json();
          const hasCustom = !!data.thumbnailUrl;
          console.log("Custom thumbnail check:", {
            roomId,
            hasCustom,
            thumbnailUrl: data.thumbnailUrl,
          });
          setHasCustomThumbnail(hasCustom);
        }
      } catch (error) {
        console.error("Error checking custom thumbnail:", error);
      }
    };

    if (roomId) {
      checkCustomThumbnail();
    }
  }, [roomId]);

  // Re-check for custom thumbnail when room becomes active
  useEffect(() => {
    if (isActive && roomId) {
      const checkCustomThumbnail = async () => {
        try {
          const response = await fetch(`/api/room-thumbnail?roomId=${roomId}`);
          if (response.ok) {
            const data = await response.json();
            const hasCustom = !!data.thumbnailUrl;
            console.log("Re-checking custom thumbnail:", {
              roomId,
              hasCustom,
              thumbnailUrl: data.thumbnailUrl,
            });
            setHasCustomThumbnail(hasCustom);
          }
        } catch (error) {
          console.error("Error re-checking custom thumbnail:", error);
        }
      };

      checkCustomThumbnail();
    }
  }, [roomId, isActive]);

  // Periodic check for custom thumbnails (every 30 seconds)
  useEffect(() => {
    if (!isActive || !roomId) return;

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/room-thumbnail?roomId=${roomId}`);
        if (response.ok) {
          const data = await response.json();
          const hasCustom = !!data.thumbnailUrl;
          if (hasCustom !== hasCustomThumbnail) {
            console.log("Custom thumbnail status changed:", {
              roomId,
              hasCustom,
              wasHasCustom: hasCustomThumbnail,
            });
            setHasCustomThumbnail(hasCustom);
          }
        }
      } catch (error) {
        console.error("Error in periodic custom thumbnail check:", error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [roomId, isActive, hasCustomThumbnail]);

  useEffect(() => {
    console.log("Auto thumbnail effect:", {
      roomId,
      isActive,
      hasCustomThumbnail,
    });

    // Always clear interval first
    if (intervalRef.current) {
      console.log("Clearing existing interval");
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't start auto screenshots if custom thumbnail exists
    if (!isActive || !roomId || hasCustomThumbnail) {
      console.log("Not starting auto screenshots:", {
        isActive,
        hasRoomId: !!roomId,
        hasCustomThumbnail,
      });
      return;
    }

    // Take initial screenshot when room becomes active
    const takeScreenshot = async () => {
      try {
        // Check for custom thumbnail before taking screenshot
        const checkResponse = await fetch(
          `/api/room-thumbnail?roomId=${roomId}`
        );
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.thumbnailUrl) {
            console.log(
              "Custom thumbnail detected during screenshot, stopping auto screenshots"
            );
            setHasCustomThumbnail(true);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }
        }

        const now = Date.now();
        // Only take screenshot if enough time has passed since last update
        if (now - lastUpdateRef.current >= intervalMs) {
          console.log("Taking auto screenshot for room:", roomId);
          const response = await fetch("/api/room-thumbnail", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ roomId }),
          });

          if (response.ok) {
            lastUpdateRef.current = now;
            console.log("Auto screenshot completed for room:", roomId);
          }
        }
      } catch (error) {
        console.error("Error updating thumbnail:", error);
      }
    };

    // Take initial screenshot
    takeScreenshot();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(takeScreenshot, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomId, isActive, intervalMs, hasCustomThumbnail]);

  return null;
}
