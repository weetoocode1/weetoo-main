import { useEffect, useRef } from "react";

interface UseAutoThumbnailProps {
  roomId: string;
  intervalMs?: number;
}

export function useAutoThumbnail({
  roomId,
  intervalMs = 600000, // 10 minutes
}: UseAutoThumbnailProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCustomThumbnail = useRef(false);

  useEffect(() => {
    // Check for custom thumbnail on mount and when roomId changes
    const checkCustomThumbnail = async () => {
      try {
        console.log(`Checking for custom thumbnail for room: ${roomId}`);
        const response = await fetch(`/api/room-thumbnail?roomId=${roomId}`);
        const data = await response.json();

        console.log(`Thumbnail API response for room ${roomId}:`, data);

        if (data.has_custom_thumbnail) {
          console.log(
            `Custom thumbnail detected for room ${roomId}, stopping auto-screenshots`
          );
          hasCustomThumbnail.current = true;
          return;
        } else {
          console.log(
            `No custom thumbnail for room ${roomId}, auto-screenshots will continue`
          );
        }
      } catch (error) {
        console.error(`Error checking thumbnail for room ${roomId}:`, error);
        // Silent error handling
      }

      hasCustomThumbnail.current = false;
    };

    // Initial check
    checkCustomThumbnail();

    // Periodic check for custom thumbnail (every 30 seconds)
    const customThumbnailInterval = setInterval(checkCustomThumbnail, 30000);

    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't start auto-screenshots if we have a custom thumbnail
    if (hasCustomThumbnail.current) {
      return () => {
        clearInterval(customThumbnailInterval);
      };
    }

    // Start auto-screenshots
    const takeScreenshot = async () => {
      console.log(`takeScreenshot function called for room: ${roomId}`);

      try {
        // Check for custom thumbnail before taking screenshot
        console.log(`Checking for custom thumbnail for room: ${roomId}`);
        await checkCustomThumbnail();

        if (hasCustomThumbnail.current) {
          console.log(
            `Custom thumbnail detected for room: ${roomId}, stopping auto-screenshots`
          );
          // Stop auto-screenshots if custom thumbnail is detected
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        // Test: Add a simple log to verify the function is being called
        console.log(
          `Taking screenshot for room: ${roomId} at ${new Date().toISOString()}`
        );

        console.log(
          `Making API call to /api/room-thumbnail for room: ${roomId}`
        );
        const response = await fetch("/api/room-thumbnail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
        });

        console.log(
          `API response status: ${response.status} for room: ${roomId}`
        );

        if (response.ok) {
          console.log(`Screenshot completed for room: ${roomId}`);
        } else {
          const errorData = await response.json();
          console.error(`Screenshot failed for room: ${roomId}`, errorData);
          if (errorData.message?.includes("not available")) {
            // Stop auto-screenshots if not available
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error(`Error taking screenshot for room: ${roomId}`, error);
      }
    };

    // Take initial screenshot
    console.log(`Starting auto-screenshots for room: ${roomId}`);
    takeScreenshot();

    // Set up interval for periodic screenshots (every 10 minutes)
    intervalRef.current = setInterval(() => {
      console.log(
        `Interval fired for room: ${roomId} at ${new Date().toISOString()}`
      );
      takeScreenshot();
    }, intervalMs);

    console.log(
      `Auto-screenshot interval set for room: ${roomId} every ${intervalMs}ms (${
        intervalMs / 60000
      } minutes)`
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearInterval(customThumbnailInterval);
    };
  }, [roomId, intervalMs]);
}
