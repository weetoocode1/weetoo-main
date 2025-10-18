"use client";

import { useEffect } from "react";

export default function SchedulerInitializer() {
  useEffect(() => {
    // Initialize scheduler by calling the API route (if it exists).
    // Guard against environments where the route was removed and returns HTML.
    const init = async () => {
      try {
        const response = await fetch("/api/init-scheduler", {
          cache: "no-store",
        });
        if (!response.ok) {
          console.warn(
            "Scheduler init skipped (route not available):",
            response.status
          );
          return;
        }
        const ct = response.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await response.text();
          console.warn(
            "Scheduler init returned non-JSON, ignoring.",
            text.slice(0, 120)
          );
          return;
        }
        const data = await response.json();
        console.log("Scheduler initialization:", data);
      } catch (error) {
        console.error("Failed to initialize scheduler:", error);
      }
    };
    init();
  }, []);

  // This component renders nothing
  return null;
}
