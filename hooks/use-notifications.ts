import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  byAudience: (audience: string) =>
    [...NOTIFICATION_KEYS.all, "audience", audience] as const,
  stats: () => [...NOTIFICATION_KEYS.all, "stats"] as const,
};

interface Notification {
  id: string;
  audience: "admin" | "user";
  type: string;
  title?: string | null;
  body?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  read?: boolean; // Changed from is_read to read
}

interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  otherCount: number;
}

const notificationApi = {
  // Get all notifications for admins
  getAllNotifications: async (): Promise<Notification[]> => {
    const supabase = createClient();
    console.log("Fetching all notifications...");

    // First, let's test if we can access the table at all
    try {
      const { data: testData, error: testError } = await supabase
        .from("notifications")
        .select("id")
        .limit(1);

      if (testError) {
        console.error("Test query failed:", testError);
        throw new Error(`Table access denied: ${testError.message}`);
      }

      console.log("Table access test successful");
    } catch (testErr) {
      console.error("Table access test error:", testErr);
      throw testErr;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }

    console.log("Notifications fetched successfully:", data?.length || 0);
    return data || [];
  },

  // Get notifications by audience
  getNotificationsByAudience: async (
    audience: "admin" | "user"
  ): Promise<Notification[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("audience", audience)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get notification stats
  getNotificationStats: async (): Promise<NotificationStats> => {
    const supabase = createClient();
    console.log("Fetching notification stats...");

    try {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true });

      if (totalError) {
        console.error("Error getting total count:", totalError);
        throw totalError;
      }

      // Get unread count
      const { count: unreadCount, error: unreadError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);

      if (unreadError) {
        console.error("Error getting unread count:", unreadError);
        throw unreadError;
      }

      // Get read count
      const { count: readCount, error: readError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", true);

      if (readError) {
        console.error("Error getting read count:", readError);
        throw readError;
      }

      // Calculate other count (total - unread - read)
      const otherCount = Math.max(
        0,
        (totalCount || 0) - (unreadCount || 0) - (readCount || 0)
      );

      const stats = {
        totalCount: totalCount || 0,
        unreadCount: unreadCount || 0,
        readCount: readCount || 0,
        otherCount: otherCount,
      };

      console.log("Notification stats fetched successfully:", stats);
      return stats;
    } catch (error) {
      console.error("Error in getNotificationStats:", error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) throw error;
  },
};

// Hook to get all notifications (for admin)
export function useAllNotifications() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: NOTIFICATION_KEYS.all,
    queryFn: () => notificationApi.getAllNotifications(),
    enabled: !!isAdmin,
    staleTime: 0, // Always fresh for realtime updates
    gcTime: 5 * 60 * 1000,
  });
}

// Hook to get notifications by audience
export function useNotificationsByAudience(audience: "admin" | "user") {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.byAudience(audience),
    queryFn: () => notificationApi.getNotificationsByAudience(audience),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

// Hook to get notification stats
export function useNotificationStats() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: NOTIFICATION_KEYS.stats(),
    queryFn: () => notificationApi.getNotificationStats(),
    enabled: !!isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

// Hook to mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.stats() });
    },
  });
}
