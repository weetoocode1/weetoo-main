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

// Notification configurations for admin notifications
const adminNotificationConfigs: Record<string, NotificationConfig> = {
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
  deposit_request_created: {
    toastType: "info",
    title: "New Deposit Request",
    description: (metadata) => {
      const userName = metadata?.user_name || "User";
      const korAmount = metadata?.kor_coins_amount;
      const display =
        typeof korAmount === "number"
          ? `${korAmount.toLocaleString()} KOR`
          : "deposit";
      return `${userName} requested ${display}`;
    },
    duration: 6000,
  },
  user_registered: {
    toastType: "info",
    title: "New User Registration",
    description: () => "A new user has registered",
    duration: 5000,
  },
  // Add more admin notification types here easily
  identity_verification_completed: {
    toastType: "success",
    title: "Identity Verification Completed",
    description: (metadata) => {
      const userName = metadata?.user_name || "User";
      return `${userName} has completed identity verification`;
    },
    duration: 5000,
  },
  suspicious_activity_detected: {
    toastType: "warning",
    title: "Suspicious Activity Detected",
    description: (metadata) => {
      const userName = metadata?.user_name || "User";
      const activity = metadata?.activity_type || "activity";
      return `Suspicious ${activity} detected for user ${userName}`;
    },
    duration: 8000,
  },
  system_maintenance: {
    toastType: "info",
    title: "System Maintenance",
    description: (metadata) => {
      const message = metadata?.message || "System maintenance is scheduled";
      return String(message);
    },
    duration: 10000,
  },
};

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
    typeof config.title === "function" ? config.title(metadata) : config.title;

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

    // Use the notification configs and showToast function defined outside

    // heartbeat system
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

    // Extra recovery hooks: visibility and network
    const attachRecoveryHooks = () => {
      const onVisible = () => {
        if (!isAdminRef.current) return;
        const now = Date.now();
        const stale = now - connectionRef.current.lastHeartbeat > 30000;
        if (
          !connectionRef.current.channel ||
          stale ||
          !connectionRef.current.isActive
        ) {
          console.log(
            "AdminRealtimeToasts: visibility recovery → re-establish"
          );
          establishConnection();
        }
      };
      const onOnline = () => {
        if (!isAdminRef.current) return;
        console.log("AdminRealtimeToasts: network online → re-establish");
        establishConnection();
      };
      window.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", onOnline);
      return () => {
        window.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("online", onOnline);
      };
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

      // Debug channel to see ALL notifications
      const debugChannel = supabase.channel("admin-debug-all").on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          console.log(
            "AdminRealtimeToasts: DEBUG - All notifications:",
            payload
          );
        }
      );

      // Create new channel
      const channel = supabase.channel("admin-toasts").on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          console.log("AdminRealtimeToasts: Raw payload received:", payload);

          if (!isAdminRef.current) {
            console.log("AdminRealtimeToasts: Not admin, skipping");
            return;
          }

          const row = payload.new as AdminNotificationPayload;
          console.log("AdminRealtimeToasts: Parsed notification row:", row);

          if (row?.audience !== "admin") {
            console.log(
              "AdminRealtimeToasts: Skipping non-admin notification:",
              row?.audience
            );
            return;
          }

          // Debug logging
          console.log("AdminRealtimeToasts: Processing admin notification", {
            type: row.type,
            audience: row.audience,
            metadata: row.metadata,
          });

          // Update heartbeat on any activity
          connectionRef.current.lastHeartbeat = Date.now();

          // Get config for this notification type
          const config =
            adminNotificationConfigs[row.type] ||
            getGenericConfig(
              row.type,
              row.title || undefined,
              row.body || undefined
            );

          console.log("AdminRealtimeToasts: Using config:", config);

          // Show toast with dynamic configuration
          showToast(config, row.metadata || {});
        }
      );

      // Subscribe to debug channel first
      debugChannel.subscribe();

      // Subscribe with silent error handling
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("AdminRealtimeToasts: Channel SUBSCRIBED successfully");
          connectionRef.current.isConnecting = false;
          connectionRef.current.retryCount = 0; // Reset retry count on success
          connectionRef.current.channel = channel;
          connectionRef.current.lastHeartbeat = Date.now();

          // Start heartbeat and health monitoring
          startHeartbeat();
          startHealthCheck();

          console.log(
            "AdminRealtimeToasts: Connection fully established with channel:",
            channel
          );
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

      // Don't set channel until subscription is successful
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

    // Initial connection + recovery hooks
    const detachRecovery = attachRecoveryHooks();
    establishConnection();

    // Cleanup function
    return () => {
      connectionRef.current.isActive = false;
      stopIntervals();
      detachRecovery();

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

  // Show simple status indicator (only in development)
  if (process.env.NODE_ENV === "development" && isAdmin) {
    return (
      // <div
      //   style={{
      //     position: "fixed",
      //     top: "10px",
      //     right: "10px",
      //     background:
      //       connectionRef.current.isActive && connectionRef.current.channel
      //         ? "#10b981"
      //         : "#ef4444",
      //     color: "white",
      //     padding: "4px 8px",
      //     borderRadius: "4px",
      //     fontSize: "12px",
      //     zIndex: 9999,
      //     pointerEvents: "none",
      //   }}
      // >
      //   <div>
      //     🔔 Admin:{" "}
      //     {connectionRef.current.isActive && connectionRef.current.channel
      //       ? "Connected"
      //       : "Disconnected"}
      //   </div>
      //   <button
      //     onClick={() => {
      //       // Test admin notification to verify toast system works
      //       const testNotification = {
      //         type: "deposit_request_created",
      //         audience: "admin" as const,
      //         metadata: {
      //           user_name: "Test User",
      //           kor_coins_amount: 1000,
      //         },
      //       };

      //       const config =
      //         adminNotificationConfigs[testNotification.type] ||
      //         getGenericConfig(
      //           testNotification.type,
      //           "Test Admin Notification",
      //           "This is a test admin notification"
      //         );

      //       showToast(config, testNotification.metadata);
      //     }}
      //     style={{
      //       background: "rgba(255,255,255,0.2)",
      //       border: "none",
      //       color: "white",
      //       padding: "2px 6px",
      //       borderRadius: "2px",
      //       fontSize: "10px",
      //       cursor: "pointer",
      //       marginTop: "4px",
      //     }}
      //   >
      //     Test Admin Toast
      //   </button>
      // </div>
      <div></div>
    );
  }

  return null;
}

export default AdminRealtimeToasts;
