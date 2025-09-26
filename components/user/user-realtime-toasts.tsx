"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";

interface UserNotificationPayload {
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

// Note: translation-aware config builders are defined inside the component

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

export function UserRealtimeToasts() {
  const { user } = useAuth();
  const t = useTranslations("user.realtimeToasts");
  const userRef = useRef(user);
  // Translation-aware generic fallback
  const getGenericConfig = (
    type: string,
    title?: string,
    body?: string
  ): NotificationConfig => ({
    toastType: "info",
    title: title || t("generic.title"),
    description: () => body || t("generic.description"),
    duration: 5000,
  });

  // Translation-aware notification configurations
  const userNotificationConfigs: Record<string, NotificationConfig> = {
    user_banned: {
      toastType: "error",
      title: (metadata) =>
        metadata?.title?.toString?.() || t("userBanned.title"),
      description: (metadata) => {
        const reason = (metadata?.reason as string) || "";
        return reason
          ? t("userBanned.descriptionWithReason", { reason })
          : t("userBanned.description");
      },
      duration: 6000,
    },
    deposit_failed: {
      toastType: "error",
      title: t("depositFailed.title"),
      description: (metadata) => {
        const amount = metadata?.kor_coins_amount as number | undefined;
        const display =
          typeof amount === "number"
            ? `${amount.toLocaleString()} KOR`
            : t("depositFailed.defaultDisplay");
        const reason = (metadata?.reason as string) || "";
        return reason
          ? t("depositFailed.descriptionWithReason", { display, reason })
          : t("depositFailed.description", { display });
      },
      duration: 6000,
    },
    deposit_success: {
      toastType: "success",
      title: t("depositSuccess.title"),
      description: (metadata) => {
        const amount = metadata?.kor_coins_amount as number | undefined;
        const display =
          typeof amount === "number"
            ? `${amount.toLocaleString()} KOR`
            : t("depositSuccess.defaultDisplay");
        return t("depositSuccess.description", { display });
      },
      duration: 5000,
    },
    withdrawal_success: {
      toastType: "success",
      title: t("withdrawalSuccess.title"),
      description: (metadata) => {
        const amount = metadata?.kor_coins_amount as number | undefined;
        const display =
          typeof amount === "number"
            ? `${amount.toLocaleString()} KOR`
            : t("withdrawalSuccess.defaultDisplay");
        return t("withdrawalSuccess.description", { display });
      },
      duration: 5000,
    },
    withdrawal_failed: {
      toastType: "error",
      title: t("withdrawalFailed.title"),
      description: (metadata) => {
        const amount = metadata?.kor_coins_amount as number | undefined;
        const display =
          typeof amount === "number"
            ? `${amount.toLocaleString()} KOR`
            : t("withdrawalFailed.defaultDisplay");
        const reason = (metadata?.reason as string) || "";
        return reason
          ? t("withdrawalFailed.descriptionWithReason", { display, reason })
          : t("withdrawalFailed.description", { display });
      },
      duration: 6000,
    },
    deposit_completed: {
      toastType: "success",
      title: t("depositCompleted.title"),
      description: (metadata) => {
        const amount = metadata?.kor_coins_amount as number | undefined;
        const display =
          typeof amount === "number"
            ? `${amount.toLocaleString()} KOR`
            : t("depositCompleted.defaultDisplay");
        return t("depositCompleted.description", { display });
      },
      duration: 5000,
    },
    account_verified: {
      toastType: "success",
      title: t("accountVerified.title"),
      description: () => t("accountVerified.description"),
      duration: 5000,
    },
    level_up: {
      toastType: "success",
      title: t("levelUp.title"),
      description: (metadata) => {
        const newLevel = (metadata?.new_level as number | string) ?? "";
        return t("levelUp.description", { level: newLevel });
      },
      duration: 4000,
    },
    kor_coins_credited: {
      toastType: "success",
      title: t("korCoinsCredited.title"),
      description: (metadata) => {
        const amount = metadata?.kor_coins_amount as number | undefined;
        const display =
          typeof amount === "number"
            ? `${amount.toLocaleString()} KOR`
            : t("korCoinsCredited.defaultDisplay");
        return t("korCoinsCredited.description", { display });
      },
      duration: 5000,
    },
    payment_confirmed: {
      toastType: "success",
      title: t("paymentConfirmed.title"),
      description: (metadata) => {
        const amount = metadata?.kor_coins_amount as number | undefined;
        const display =
          typeof amount === "number"
            ? `${amount.toLocaleString()} KOR`
            : t("paymentConfirmed.defaultDisplay");
        return t("paymentConfirmed.description", { display });
      },
      duration: 5000,
    },
    post_shared: {
      toastType: "info",
      title: () => "", // Empty title to suppress toast
      description: () => "", // Empty description to suppress toast
      duration: 0, // Immediate dismissal
    },
    post_created: {
      toastType: "info",
      title: () => "", // Empty title to suppress toast
      description: () => "", // Empty description to suppress toast
      duration: 0, // Immediate dismissal
    },
    post_commented: {
      toastType: "info",
      title: () => "", // Empty title to suppress toast
      description: () => "", // Empty description to suppress toast
      duration: 0, // Immediate dismissal
    },
    post_liked: {
      toastType: "info",
      title: () => "", // Empty title to suppress toast
      description: () => "", // Empty description to suppress toast
      duration: 0, // Immediate dismissal
    },
    daily_login: {
      toastType: "info",
      title: () => "", // Empty title to suppress toast
      description: () => "", // Empty description to suppress toast
      duration: 0, // Immediate dismissal
    },
    room_created: {
      toastType: "info",
      title: () => "", // Empty title to suppress toast
      description: () => "", // Empty description to suppress toast
      duration: 0, // Immediate dismissal
    },
  };
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
    userRef.current = user;

    // Debug logging to troubleshoot route issues
    // console.log("UserRealtimeToasts: Auth state changed", {
    //   userId: user?.id,
    //   pathname: window.location.pathname,
    // });
  }, [user?.id]);

  useEffect(() => {
    // Debug: Log current state
    // console.log("UserRealtimeToasts: Component mounted/updated", {
    //   userId: user?.id,
    //   pathname: window.location.pathname,
    //   userRef: userRef.current,
    // });

    if (!user?.id) {
      // console.log("UserRealtimeToasts: no user, skipping subscription", {
      //   userId: user?.id,
      //   pathname: window.location.pathname,
      // });
      return;
    }

    // Only log once on initial setup
    // console.log("UserRealtimeToasts: initializing for user", {
    //   userId: user?.id,
    //   pathname: window.location.pathname,
    // });

    // Use the notification configs and showToast function defined outside

    // heartbeat system
    const startHeartbeat = () => {
      if (connectionRef.current.heartbeatInterval) {
        clearInterval(connectionRef.current.heartbeatInterval);
      }

      connectionRef.current.heartbeatInterval = setInterval(() => {
        if (!connectionRef.current.isActive || !userRef.current) return;

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
          // console.log("UserRealtimeToasts: heartbeat timeout, reconnecting...");
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
        if (!connectionRef.current.isActive || !userRef.current) return;

        const now = Date.now();
        const connectionAge = now - connectionRef.current.connectionStartTime;
        const timeSinceLastError = now - connectionRef.current.lastError;

        // If connection is old (>10 minutes) and had recent errors, refresh it
        if (connectionAge > 600000 && timeSinceLastError < 300000) {
          // console.log("UserRealtimeToasts: connection aging, refreshing...");
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
        if (!userRef.current) return;
        const now = Date.now();
        const stale = now - connectionRef.current.lastHeartbeat > 30000;
        if (
          !connectionRef.current.channel ||
          stale ||
          !connectionRef.current.isActive
        ) {
          // console.log("UserRealtimeToasts: visibility recovery → re-establish");
          establishConnection();
        }
      };
      const onOnline = () => {
        if (!userRef.current) return;
        // console.log("UserRealtimeToasts: network online → re-establish");
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
      const debugChannel = supabase.channel(`user-debug-all-${user.id}`).on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          // console.log(
          //   "UserRealtimeToasts: DEBUG - All notifications:",
          //   payload
          // );
        }
      );

      // Create new channel
      const channel = supabase.channel(`user-toasts-${user.id}`).on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // console.log("UserRealtimeToasts: Raw payload received:", payload);

          if (!userRef.current) {
            // console.log("UserRealtimeToasts: No user, skipping");
            return;
          }

          const row = payload.new as UserNotificationPayload;
          // console.log("UserRealtimeToasts: Parsed notification row:", row);

          if (row?.audience !== "user") {
            // console.log(
            //   "UserRealtimeToasts: Skipping non-user notification:",
            //   row?.audience
            // );
            return;
          }

          // Debug logging
          // console.log("UserRealtimeToasts: Processing user notification", {
          //   type: row.type,
          //   audience: row.audience,
          //   metadata: row.metadata,
          // });

          // Update heartbeat on any activity
          connectionRef.current.lastHeartbeat = Date.now();

          // Skip showing toast for reward types (they're handled by user-dropdown.tsx)
          const rewardTypes = [
            "post_shared",
            "post_created",
            "post_commented",
            "post_liked",
            "daily_login",
            "room_created",
          ];
          if (rewardTypes.includes(row.type)) {
            return; // Skip showing toast for reward notifications
          }

          // Get config for this notification type
          const config =
            userNotificationConfigs[row.type] ||
            getGenericConfig(
              row.type,
              row.title || undefined,
              row.body || undefined
            );

          // console.log("UserRealtimeToasts: Using config:", config);

          // Show toast with dynamic configuration
          showToast(config, row.metadata || {});
        }
      );

      // Subscribe to debug channel first
      debugChannel.subscribe();

      // Subscribe with silent error handling
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // console.log("UserRealtimeToasts: Channel SUBSCRIBED successfully");
          connectionRef.current.isConnecting = false;
          connectionRef.current.retryCount = 0; // Reset retry count on success
          connectionRef.current.channel = channel;
          connectionRef.current.lastHeartbeat = Date.now();

          // Start heartbeat and health monitoring
          startHeartbeat();
          startHealthCheck();

          // console.log(
          //   "UserRealtimeToasts: Connection fully established with channel:",
          //   channel
          // );
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
          if (connectionRef.current.isActive && userRef.current) {
            handleConnectionError();
          }
        }
      });

      // Don't set channel until subscription is successful
    };

    // Silent error handling with exponential backoff
    const handleConnectionError = () => {
      if (!connectionRef.current.isActive || !userRef.current) return;

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
        if (connectionRef.current.isActive && userRef.current) {
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
  }, [user?.id]);

  // Show simple status indicator (only in development)
  if (process.env.NODE_ENV === "development" && user) {
    return (
      // <div
      //   style={{
      //     position: "fixed",
      //     top: "40px",
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
      //     🔔 User:{" "}
      //     {connectionRef.current.isActive && connectionRef.current.channel
      //       ? "Connected"
      //       : "Disconnected"}
      //   </div>
      //   <button
      //     onClick={() => {
      //       // Test user notification to verify toast system works
      //       const testNotification = {
      //         type: "deposit_success",
      //         audience: "user" as const,
      //         metadata: {
      //           user_name: "Test User",
      //           kor_coins_amount: 1000,
      //         },
      //       };

      //       const config =
      //         userNotificationConfigs[testNotification.type] ||
      //         getGenericConfig(
      //           testNotification.type,
      //           "Test User Notification",
      //           "This is a test user notification"
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
      //     Test User Toast
      //   </button>
      // </div>
      <></>
    );
  }

  return null;
}

export default UserRealtimeToasts;
