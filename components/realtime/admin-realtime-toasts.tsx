"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface AdminNotificationPayload {
  id: string;
  audience: "admin" | "user";
  type: string;
  title?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

interface NotificationConfig {
  toastType: "success" | "error" | "warning" | "info";
  title: string | ((metadata: Record<string, unknown>) => string);
  description: (metadata: Record<string, unknown>) => string;
  duration?: number;
  dismissible?: boolean;
}

export function AdminRealtimeToasts() {
  const { isAdmin, user, computed } = useAuth();
  const isAdminRef = useRef(isAdmin);
  const connectionRef = useRef<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: any;
    retryCount: number;
    maxRetries: number;
    baseDelay: number;
    isConnecting: boolean;
    lastError: number;
    isActive: boolean;
    lastHeartbeat: number;
    heartbeatInterval: NodeJS.Timeout | null;
    healthCheckInterval: NodeJS.Timeout | null;
    connectionStartTime: number;
  }>({
    channel: null,
    retryCount: 0,
    maxRetries: 15,
    baseDelay: 2000,
    isConnecting: false,
    lastError: 0,
    isActive: true,
    lastHeartbeat: 0,
    heartbeatInterval: null,
    healthCheckInterval: null,
    connectionStartTime: 0,
  });

  useEffect(() => {
    isAdminRef.current = isAdmin;

    // Debug logging to troubleshoot route issues
    console.log("AdminRealtimeToasts: Auth state changed", {
      isAdmin,
      userId: user?.id,
      userRole: computed?.role,
      pathname: window.location.pathname,
    });
  }, [isAdmin, user?.id, computed?.role]);

  useEffect(() => {
    // Debug: Log current state
    console.log("AdminRealtimeToasts: Component mounted/updated", {
      isAdmin,
      userId: user?.id,
      userRole: computed?.role,
      pathname: window.location.pathname,
      isAdminRef: isAdminRef.current,
    });

    if (!isAdmin) {
      console.log("AdminRealtimeToasts: not admin, skipping subscription", {
        isAdmin,
        userRole: computed?.role,
        pathname: window.location.pathname,
      });
      return;
    }

    // Only log once on initial setup
    console.log("AdminRealtimeToasts: initializing for admin user", {
      userId: user?.id,
      userRole: computed?.role,
      pathname: window.location.pathname,
    });

    // Simple, scalable notification configuration
    const notificationConfigs: Record<string, NotificationConfig> = {
      withdrawal_request_created: {
        toastType: "info",
        title: "New Withdrawal Request",
        description: (metadata) => {
          const userName = metadata?.user_name || "User";
          const korAmount = metadata?.kor_coins_amount;
          const display =
            typeof korAmount === "number"
              ? `${korAmount.toLocaleString()} KOR`
              : "withdrawal";
          return `${userName} requested ${display}`;
        },
        duration: 6000,
      },
      verification_needed: {
        toastType: "warning",
        title: "Verification Required",
        description: (metadata) => {
          const userName = metadata?.user_name || "User";
          const verifType = metadata?.verification_type || "verification";
          return `${userName} needs ${verifType} verification`;
        },
        duration: 7000,
      },
      user_registration: {
        toastType: "success",
        title: "New User Registration",
        description: (metadata) => {
          const userName = metadata?.user_name || "New User";
          return `${userName} has joined the platform`;
        },
        duration: 5000,
      },
      system_alert: {
        toastType: "warning",
        title: (metadata) => (metadata?.title as string) || "System Alert",
        description: (metadata) =>
          (metadata?.body as string) || "System notification",
        duration: 8000,
        dismissible: false,
      },
      competition_winner: {
        toastType: "success",
        title: "Competition Winner!",
        description: (metadata) => {
          const userName = metadata?.user_name || "User";
          const competition = metadata?.competition || "competition";
          const prize = metadata?.prize || "prize";
          return `${userName} won ${competition} - ${prize}`;
        },
        duration: 6000,
      },
      error_occurred: {
        toastType: "error",
        title: (metadata) => (metadata?.title as string) || "System Error",
        description: (metadata) =>
          (metadata?.body as string) || "An error has occurred",
        duration: 8000,
        dismissible: false,
      },
    };

    // Generic fallback config for unknown types
    const getGenericConfig = (
      type: string,
      title?: string,
      body?: string
    ): NotificationConfig => ({
      toastType: "info",
      title: title || "New Notification",
      description: () => body || "You have a new notification",
      duration: 5000,
    });

    // Simple, clean toast function
    const showToast = (
      config: NotificationConfig,
      metadata: Record<string, unknown>
    ) => {
      const toastOptions = {
        description: config.description(metadata),
        duration: config.duration,
        dismissible: config.dismissible,
      };

      const title =
        typeof config.title === "function"
          ? config.title(metadata)
          : config.title;

      switch (config.toastType) {
        case "success":
          toast.success(title, toastOptions);
          break;
        case "error":
          toast.error(title, toastOptions);
          break;
        case "warning":
          toast.warning(title, toastOptions);
          break;
        case "info":
        default:
          toast.info(title, toastOptions);
          break;
      }
    };

    // Industry-standard heartbeat system (like Discord/Slack)
    const startHeartbeat = () => {
      if (connectionRef.current.heartbeatInterval) {
        clearInterval(connectionRef.current.heartbeatInterval);
      }

      connectionRef.current.heartbeatInterval = setInterval(() => {
        if (!connectionRef.current.isActive || !isAdminRef.current) return;

        const now = Date.now();
        const timeSinceLastHeartbeat =
          now - connectionRef.current.lastHeartbeat;
        const timeSinceConnectionStart =
          now - connectionRef.current.connectionStartTime;

        // If no heartbeat for 30 seconds, connection is dead
        if (
          timeSinceLastHeartbeat > 30000 &&
          timeSinceConnectionStart > 30000
        ) {
          console.log(
            "AdminRealtimeToasts: heartbeat timeout, reconnecting..."
          );
          handleConnectionError();
          return;
        }

        // Send heartbeat to keep connection alive
        if (connectionRef.current.channel) {
          try {
            // Supabase channels automatically handle heartbeat
            // We just need to track the last activity
            connectionRef.current.lastHeartbeat = now;
          } catch (_e) {
            // Silent heartbeat error
          }
        }
      }, 15000); // Check every 15 seconds
    };

    // Connection health monitoring (enterprise-grade)
    const startHealthCheck = () => {
      if (connectionRef.current.healthCheckInterval) {
        clearInterval(connectionRef.current.healthCheckInterval);
      }

      connectionRef.current.healthCheckInterval = setInterval(() => {
        if (!connectionRef.current.isActive || !isAdminRef.current) return;

        const now = Date.now();
        const connectionAge = now - connectionRef.current.connectionStartTime;
        const timeSinceLastError = now - connectionRef.current.lastError;

        // If connection is old (>10 minutes) and had recent errors, refresh it
        if (connectionAge > 600000 && timeSinceLastError < 300000) {
          console.log("AdminRealtimeToasts: connection aging, refreshing...");
          establishConnection();
          return;
        }

        // If too many errors in short time, increase backoff
        if (connectionRef.current.retryCount > 5) {
          connectionRef.current.baseDelay = Math.min(
            connectionRef.current.baseDelay * 1.2,
            60000
          );
        }
      }, 30000); // Check every 30 seconds
    };

    // Stop all intervals
    const stopIntervals = () => {
      if (connectionRef.current.heartbeatInterval) {
        clearInterval(connectionRef.current.heartbeatInterval);
        connectionRef.current.heartbeatInterval = null;
      }
      if (connectionRef.current.healthCheckInterval) {
        clearInterval(connectionRef.current.healthCheckInterval);
        connectionRef.current.healthCheckInterval = null;
      }
    };

    // Silent connection manager with improved error handling
    const establishConnection = () => {
      if (
        !connectionRef.current.isActive ||
        connectionRef.current.isConnecting
      ) {
        return;
      }

      connectionRef.current.isConnecting = true;
      connectionRef.current.connectionStartTime = Date.now();
      const supabase = createClient();

      // Clean up existing channel if any
      if (connectionRef.current.channel) {
        try {
          supabase.removeChannel(connectionRef.current.channel);
        } catch (_e) {
          // Silent cleanup error
        }
      }

      // Create new channel
      const channel = supabase.channel("admin-toasts").on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (!isAdminRef.current) return;

          const row = payload.new as AdminNotificationPayload;
          if (row?.audience !== "admin") return;

          // Update heartbeat on any activity
          connectionRef.current.lastHeartbeat = Date.now();

          // Get config for this notification type
          const config =
            notificationConfigs[row.type] ||
            getGenericConfig(
              row.type,
              row.title || undefined,
              row.body || undefined
            );

          // Show toast with dynamic configuration
          showToast(config, row.metadata || {});
        }
      );

      // Subscribe with silent error handling
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          connectionRef.current.isConnecting = false;
          connectionRef.current.retryCount = 0; // Reset retry count on success
          connectionRef.current.channel = channel;
          connectionRef.current.lastHeartbeat = Date.now();

          // Start heartbeat and health monitoring
          startHeartbeat();
          startHealthCheck();

          // Only log initial connection, not reconnections
          if (connectionRef.current.retryCount === 0) {
            console.log("AdminRealtimeToasts: connection established");
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          connectionRef.current.isConnecting = false;
          connectionRef.current.lastError = Date.now();

          // Stop intervals on error
          stopIntervals();

          // Silent auto-recovery
          handleConnectionError();
        } else if (status === "CLOSED") {
          connectionRef.current.isConnecting = false;

          // Stop intervals on close
          stopIntervals();

          // Only attempt reconnection if still active
          if (connectionRef.current.isActive && isAdminRef.current) {
            handleConnectionError();
          }
        }
      });

      connectionRef.current.channel = channel;
    };

    // Silent error handling with exponential backoff
    const handleConnectionError = () => {
      if (!connectionRef.current.isActive || !isAdminRef.current) return;

      const now = Date.now();
      const timeSinceLastError = now - connectionRef.current.lastError;

      // Prevent rapid reconnection attempts
      if (timeSinceLastError < 10000) {
        // Increased to 10 seconds
        return;
      }

      if (
        connectionRef.current.retryCount >= connectionRef.current.maxRetries
      ) {
        // Silent failure - don't log, don't show errors
        connectionRef.current.isActive = false;
        return;
      }

      connectionRef.current.retryCount++;
      const delay = Math.min(
        connectionRef.current.baseDelay *
          Math.pow(1.5, connectionRef.current.retryCount - 1),
        30000 // Max 30 seconds delay
      );

      // Silent reconnection
      setTimeout(() => {
        if (connectionRef.current.isActive && isAdminRef.current) {
          establishConnection();
        }
      }, delay);
    };

    // Initial connection
    establishConnection();

    // Cleanup function
    return () => {
      connectionRef.current.isActive = false;
      stopIntervals();

      if (connectionRef.current.channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(connectionRef.current.channel);
        } catch (_e) {
          // Silent cleanup error
        }
      }
      connectionRef.current.isConnecting = false;
      connectionRef.current.retryCount = 0;
    };
  }, [isAdmin]);

  // Show visual indicator for debugging (only in development)
  if (process.env.NODE_ENV === "development" && isAdmin) {
    return (
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          background: "#10b981",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        🔔 Admin Notifications Active
      </div>
    );
  }

  return null;
}

export default AdminRealtimeToasts;
