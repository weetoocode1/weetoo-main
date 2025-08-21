"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface NotificationPayload {
  audience: "user";
  type: string;
  metadata: {
    kor_coins_amount?: number;
    reason?: string;
    user_name?: string;
    [key: string]: unknown;
  };
}

interface NotificationConfig {
  toastType: "success" | "error" | "warning" | "info";
  title: string;
  description: (metadata: Record<string, unknown>) => string;
  duration?: number;
}

// Notification configurations for user notifications
const userNotificationConfigs: Record<string, NotificationConfig> = {
  deposit_failed: {
    toastType: "error",
    title: "Deposit Failed",
    description: (metadata) => {
      const amount = metadata?.kor_coins_amount;
      const reason = metadata?.reason;
      const display =
        typeof amount === "number"
          ? `${amount.toLocaleString()} KOR`
          : "Your deposit";
      return `${display} was rejected${reason ? `: ${reason}` : "."}`;
    },
    duration: 6000,
  },
  deposit_success: {
    toastType: "success",
    title: "Deposit Successful",
    description: (metadata) => {
      const amount = metadata?.kor_coins_amount;
      const display =
        typeof amount === "number"
          ? `${amount.toLocaleString()} KOR`
          : "Your deposit";
      return `${display} has been successfully processed!`;
    },
    duration: 5000,
  },
  withdrawal_success: {
    toastType: "success",
    title: "Withdrawal Successful",
    description: (metadata) => {
      const amount = metadata?.kor_coins_amount;
      const display =
        typeof amount === "number"
          ? `${amount.toLocaleString()} KOR`
          : "Your withdrawal";
      return `${display} has been successfully processed!`;
    },
    duration: 5000,
  },
  withdrawal_failed: {
    toastType: "error",
    title: "Withdrawal Failed",
    description: (metadata) => {
      const amount = metadata?.kor_coins_amount;
      const reason = metadata?.reason;
      const display =
        typeof amount === "number"
          ? `${amount.toLocaleString()} KOR`
          : "Your withdrawal";
      return `${display} was rejected${reason ? `: ${reason}` : "."}`;
    },
    duration: 6000,
  },
  // Add more notification types here easily
  deposit_completed: {
    toastType: "success",
    title: "Deposit Completed!",
    description: (metadata) => {
      const amount = metadata?.kor_coins_amount;
      const display =
        typeof amount === "number"
          ? `${amount.toLocaleString()} KOR`
          : "Your deposit";
      return `${display} has been successfully credited to your account!`;
    },
    duration: 5000,
  },
  account_verified: {
    toastType: "success",
    title: "Account Verified",
    description: () => "Your account has been successfully verified!",
    duration: 5000,
  },
  level_up: {
    toastType: "success",
    title: "Level Up!",
    description: (metadata) => {
      const newLevel = metadata?.new_level;
      return `Congratulations! You've reached level ${newLevel || "up"}!`;
    },
    duration: 4000,
  },
  // Additional notification types that might be sent from backend
  kor_coins_credited: {
    toastType: "success",
    title: "KOR Coins Credited!",
    description: (metadata) => {
      const amount = metadata?.kor_coins_amount;
      const display =
        typeof amount === "number"
          ? `${amount.toLocaleString()} KOR`
          : "KOR coins";
      return `${display} have been credited to your account!`;
    },
    duration: 5000,
  },
  payment_confirmed: {
    toastType: "success",
    title: "Payment Confirmed!",
    description: (metadata) => {
      const amount = metadata?.kor_coins_amount;
      const display =
        typeof amount === "number"
          ? `${amount.toLocaleString()} KOR`
          : "Your payment";
      return `${display} has been confirmed and processed!`;
    },
    duration: 5000,
  },
};

// Generic fallback config for unknown notification types
const getGenericUserConfig = (type: string): NotificationConfig => ({
  toastType: "info",
  title: "New Notification",
  description: () => `You have a new ${type.replace(/_/g, " ")} notification`,
  duration: 5000,
});

// Helper function to show toast based on notification config
const showUserToast = (
  config: NotificationConfig,
  metadata: Record<string, unknown>
) => {
  const toastOptions = {
    description: config.description(metadata),
    duration: config.duration,
  };

  switch (config.toastType) {
    case "success":
      toast.success(config.title, toastOptions);
      break;
    case "error":
      toast.error(config.title, toastOptions);
      break;
    case "warning":
      toast.warning(config.title, toastOptions);
      break;
    case "info":
    default:
      toast.info(config.title, toastOptions);
      break;
  }
};

export function UserRealtimeToasts() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Only subscribe if user is authenticated
    if (!user?.id) {
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout;
    let healthCheckInterval: NodeJS.Timeout;

    const supabase = createClient();
    let isActive = true;

    const setupChannels = () => {
      try {
        // First, let's subscribe to ALL notifications to debug what's happening
        const debugChannel = supabase
          .channel(`debug-all-notifications-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
            },
            (payload) => {
              console.log(
                "UserRealtimeToasts: DEBUG - All notifications:",
                payload
              );
            }
          );

        // Main user notifications channel
        const channel = supabase.channel(`user-toasts-${user.id}`).on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`, // Filter notifications for this specific user
          },
          (payload) => {
            console.log(
              "UserRealtimeToasts: Received notification payload:",
              payload
            );

            const row = payload.new as NotificationPayload;
            if (row?.audience !== "user") {
              console.log(
                "UserRealtimeToasts: Skipping non-user notification:",
                row?.audience
              );
              return;
            }

            console.log("UserRealtimeToasts: Processing user notification:", {
              type: row.type,
              metadata: row.metadata,
            });

            // Get notification config for this type
            const config =
              userNotificationConfigs[row.type] ||
              getGenericUserConfig(row.type);

            console.log("UserRealtimeToasts: Using config:", config);
            console.log(
              "UserRealtimeToasts: Available configs:",
              Object.keys(userNotificationConfigs)
            );
            console.log(
              "UserRealtimeToasts: Notification type received:",
              row.type
            );

            // Show toast using the configuration
            showUserToast(config, row.metadata || {});
          }
        );

        // KOR Coins real-time update channel
        const korCoinsChannel = supabase
          .channel(`user-kor-coins-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "users",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              console.log(
                "UserRealtimeToasts: KOR coins update received:",
                payload
              );

              const newData = payload.new as { kor_coins?: number };
              if (newData?.kor_coins !== undefined) {
                // Dispatch custom event to update KOR coins across components
                window.dispatchEvent(
                  new CustomEvent("kor-coins-updated", {
                    detail: {
                      userId: user.id,
                      newAmount: newData.kor_coins,
                    },
                  })
                );

                console.log(
                  "UserRealtimeToasts: KOR coins updated to:",
                  newData.kor_coins
                );
              }
            }
          );

        // Subscribe to all channels with proper error handling
        const subscribeToChannel = (
          channel: ReturnType<typeof supabase.channel>,
          channelName: string
        ) => {
          return new Promise((resolve, reject) => {
            channel.subscribe((status: string) => {
              console.log(`UserRealtimeToasts: ${channelName} status:`, status);

              if (status === "SUBSCRIBED") {
                console.log(
                  `UserRealtimeToasts: ${channelName} connected successfully`
                );
                resolve(status);
              } else if (status === "CHANNEL_ERROR") {
                console.error(
                  `UserRealtimeToasts: ${channelName} error:`,
                  status
                );
                reject(new Error(`CHANNEL_ERROR on ${channelName}`));
              } else if (status === "TIMED_OUT") {
                console.warn(`UserRealtimeToasts: ${channelName} timed out`);
                reject(new Error(`TIMED_OUT on ${channelName}`));
              } else if (status === "CLOSED") {
                console.log(`UserRealtimeToasts: ${channelName} closed`);
                reject(new Error(`CLOSED on ${channelName}`));
              }
            });
          });
        };

        // Subscribe to all channels
        Promise.all([
          subscribeToChannel(debugChannel, "Debug"),
          subscribeToChannel(channel, "Main"),
          subscribeToChannel(korCoinsChannel, "KOR Coins"),
        ])
          .then(() => {
            console.log(
              "UserRealtimeToasts: All channels connected successfully"
            );
            setIsConnected(true);
            setRetryCount(0);
            setIsReconnecting(false);
          })
          .catch((error) => {
            console.error(
              "UserRealtimeToasts: Failed to connect channels:",
              error
            );
            setIsConnected(false);
            handleReconnection();
          });

        // Setup heartbeat to keep connection alive
        heartbeatInterval = setInterval(() => {
          if (isActive && isConnected) {
            try {
              // Send a ping to keep connection alive
              channel.send({
                type: "broadcast",
                event: "heartbeat",
                payload: { timestamp: Date.now() },
              });
            } catch (error) {
              console.warn("UserRealtimeToasts: Heartbeat failed:", error);
              handleReconnection();
            }
          }
        }, 30000); // Every 30 seconds

        // Health check every 60 seconds
        healthCheckInterval = setInterval(() => {
          if (isActive && isConnected) {
            // Check if channels are still active
            const channels = supabase.getChannels();
            const hasActiveChannels = channels.some(
              (ch) => ch.state === "joined"
            );

            if (!hasActiveChannels) {
              console.warn(
                "UserRealtimeToasts: No active channels found, reconnecting..."
              );
              handleReconnection();
            }
          }
        }, 60000); // Every 60 seconds

        // Cleanup function
        return () => {
          try {
            clearInterval(heartbeatInterval);
            clearInterval(healthCheckInterval);
            supabase.removeChannel(debugChannel);
            supabase.removeChannel(channel);
            supabase.removeChannel(korCoinsChannel);
          } catch (error) {
            console.error(
              "UserRealtimeToasts: Error removing channels:",
              error
            );
          }
        };
      } catch (error) {
        console.error("UserRealtimeToasts: Error setting up channels:", error);
        handleReconnection();
        return () => {};
      }
    };

    const handleReconnection = () => {
      if (!isActive || isReconnecting) return;

      setIsReconnecting(true);
      setIsConnected(false);

      const maxRetries = 5;
      const baseDelay = 1000; // 1 second

      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff

        console.log(
          `UserRealtimeToasts: Attempting reconnection in ${delay}ms (attempt ${
            retryCount + 1
          }/${maxRetries})`
        );

        reconnectTimeout = setTimeout(() => {
          if (isActive) {
            setRetryCount((prev) => prev + 1);
            setupChannels();
          }
        }, delay);
      } else {
        console.error("UserRealtimeToasts: Max reconnection attempts reached");
        setIsReconnecting(false);
        // Show user-friendly error message
        toast.error(
          "Real-time connection failed. Please refresh the page to reconnect."
        );
      }
    };

    // Initial setup
    const cleanup = setupChannels();

    return () => {
      isActive = false;
      clearTimeout(reconnectTimeout);
      clearInterval(heartbeatInterval);
      clearInterval(healthCheckInterval);
      if (cleanup) cleanup();
    };
  }, [user?.id, retryCount]); // Add retryCount as dependency

  // Show simple status indicator (only in development)
  if (process.env.NODE_ENV === "development" && user) {
    return (
      <div
        style={{
          position: "fixed",
          top: "40px",
          right: "10px",
          background: isConnected ? "#10b981" : "#ef4444",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 9999,
          pointerEvents: "auto",
          marginTop: "30px",
        }}
      >
        <div>
          🔔 User:{" "}
          {isConnected
            ? "Connected"
            : isReconnecting
            ? "Reconnecting..."
            : "Disconnected"}
        </div>
        <div style={{ fontSize: "10px", marginTop: "2px" }}>
          KOR Coins: Real-time enabled
        </div>
        {isReconnecting && (
          <div style={{ fontSize: "10px", marginTop: "2px", opacity: 0.8 }}>
            Attempt {retryCount + 1}/5
          </div>
        )}
        <button
          onClick={() => {
            // Test notification to verify toast system works
            const testNotification = {
              type: "deposit_success",
              audience: "user" as const,
              metadata: {
                kor_coins_amount: 1000,
                user_name: "Test User",
              },
            };

            const config =
              userNotificationConfigs[testNotification.type] ||
              getGenericUserConfig(testNotification.type);
            showUserToast(config, testNotification.metadata);
          }}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "white",
            padding: "2px 6px",
            borderRadius: "2px",
            fontSize: "10px",
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          Test Success Toast
        </button>
      </div>
    );
  }

  return null;
}

export default UserRealtimeToasts;
