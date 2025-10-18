"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface WebSocketHealthStatus {
  running: boolean;
  clientCount: number;
  bybitStatus: {
    connected: boolean;
    reconnecting: boolean;
  };
  port: number;
}

export default function WebSocketHealthMonitor() {
  // Minimal status widget with dot + refresh
  const isDirectBybit =
    typeof process !== "undefined" &&
    typeof process.env?.NEXT_PUBLIC_WS_URL === "string" &&
    /stream(-testnet|-demo)?\.bybit\.com/.test(
      process.env.NEXT_PUBLIC_WS_URL as string
    );
  const [status, setStatus] = useState<WebSocketHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkWebSocketHealth = async () => {
    setIsChecking(true);
    try {
      const response = await fetch("/api/websocket");
      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      } else {
        setStatus(null);
      }
    } catch (_error) {
      setStatus(null);
    } finally {
      setIsChecking(false);
    }
  };

  const startWebSocketServer = async () => {
    try {
      const response = await fetch("/api/websocket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (response.ok) {
        await checkWebSocketHealth();
      }
    } catch {}
  };

  useEffect(() => {
    checkWebSocketHealth();
    const interval = setInterval(checkWebSocketHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compact unified UI: dot + source + refresh
  const isConnected = isDirectBybit
    ? true
    : Boolean(status?.running && status?.bybitStatus?.connected);
  // const source =
  //   process.env.NEXT_PUBLIC_WS_URL ||
  //   (status ? `ws://localhost:${status.port}` : "internal server");

  return (
    <div className="fixed bottom-4 left-4 px-3 py-2 rounded-full shadow-sm bg-muted/80 border border-border backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <span
          aria-label={isConnected ? "Connected" : "Disconnected"}
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected
              ? "bg-emerald-500 animate-pulse"
              : "bg-red-500 animate-pulse"
          }`}
        />
        <span className="text-xs text-muted-foreground max-w-[220px] truncate">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        {!isDirectBybit && !status?.running && (
          <button
            onClick={startWebSocketServer}
            disabled={isChecking}
            className="text-xs text-foreground/80 hover:text-foreground disabled:opacity-50 cursor-pointer"
            title="Start server"
          >
            Start
          </button>
        )}
        <button
          onClick={checkWebSocketHealth}
          disabled={isChecking}
          className="p-1 rounded hover:bg-muted disabled:opacity-50 cursor-pointer"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw
            className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
