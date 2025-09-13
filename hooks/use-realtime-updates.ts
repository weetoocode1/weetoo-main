import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHydration } from "@/hooks/use-hydration";

interface RealtimeUpdatesProps {
  postId: string;
  onCommentUpdate?: () => void;
  onViewUpdate?: (newViewCount: number) => void;
  onLikeUpdate?: (newLikeCount: number) => void;
}

export function useRealtimeUpdates({
  postId,
  onCommentUpdate,
  onViewUpdate,
  onLikeUpdate,
}: RealtimeUpdatesProps) {
  const supabase = createClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const isHydrated = useHydration();

  // Memoize callbacks to prevent unnecessary re-subscriptions
  const handleCommentUpdate = useCallback(() => {
    console.log("🔄 Comment change detected");
    onCommentUpdate?.();
  }, [onCommentUpdate]);

  const handleViewUpdate = useCallback(
    (newViewCount: number) => {
      console.log("🔄 View update detected:", newViewCount);
      onViewUpdate?.(newViewCount);
    },
    [onViewUpdate]
  );

  const handleLikeUpdate = useCallback(
    (newLikeCount: number) => {
      console.log("🔄 Like update detected:", newLikeCount);
      onLikeUpdate?.(newLikeCount);
    },
    [onLikeUpdate]
  );

  useEffect(() => {
    if (!postId || !isHydrated) return;

    // Set up realtime subscriptions only after hydration
    subscriptionRef.current = supabase
      .channel(`post_updates_${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        handleCommentUpdate
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: `id=eq.${postId}`,
        },
        (payload) => {
          console.log("🔄 Post update detected:", payload);
          if (payload.new && typeof payload.new.views === "number") {
            handleViewUpdate(payload.new.views);
          }
          if (payload.new && typeof payload.new.likes === "number") {
            handleLikeUpdate(payload.new.likes);
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [
    postId,
    isHydrated,
    handleCommentUpdate,
    handleViewUpdate,
    handleLikeUpdate,
    supabase,
  ]);
}
