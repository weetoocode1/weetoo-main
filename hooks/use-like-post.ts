import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { useHydration } from "@/hooks/use-hydration";
import { useTranslations } from "next-intl";

export function useLikePost(postId: string, initialLikes: number) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHydrated = useHydration();
  const t = useTranslations("userDropdown.likes");

  // Fetch whether the user has liked the post
  useEffect(() => {
    if (!postId || !isHydrated) return;

    // Add a small delay to ensure hydration is complete
    const timeoutId = setTimeout(() => {
      fetch(`/api/posts/${postId}/like`)
        .then((res) => res.json())
        .then((data) => {
          setLiked(!!data.liked);
          setLikes(data.likes ?? initialLikes);
        })
        .catch(() => {
          setLiked(false);
          setLikes(initialLikes);
        });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [postId, isHydrated, initialLikes]);

  // Set up realtime updates for likes (only after hydration)
  useRealtimeUpdates({
    postId,
    onLikeUpdate: (newLikeCount) => {
      if (isHydrated) {
        console.log("🔄 Realtime like update in hook:", newLikeCount);
        setLikes(newLikeCount);
      }
    },
  });

  // Toggle like/unlike
  const toggleLike = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      if (!liked) {
        // Optimistic update
        setLiked(true);
        setLikes((l) => l + 1);
        const res = await fetch(`/api/posts/${postId}/like`, {
          method: "POST",
        });
        const data = await res.json();
        setLiked(!!data.liked);
        setLikes(data.likes ?? 0);

        // Show success toast
        toast.success(t("liked"));

        if (data?.reward) {
          const exp = data.reward.exp_delta ?? 0;
          const kor = data.reward.kor_delta ?? 0;
          if (exp > 0 || kor > 0) {
            // toast.success(`Reward earned: +${exp} EXP, +${kor} KOR`);
          }
        }
      } else {
        setLiked(false);
        setLikes((l) => Math.max(l - 1, 0));
        const res = await fetch(`/api/posts/${postId}/like`, {
          method: "DELETE",
        });
        const data = await res.json();
        setLiked(!!data.liked);
        setLikes(data.likes ?? 0);

        // Show unliked toast
        toast.success(t("unliked"));
      }
    } catch (err: any) {
      setError("Failed to update like");
    } finally {
      setLoading(false);
    }
  }, [postId, liked]);

  return { liked, likes, toggleLike, loading, error };
}
