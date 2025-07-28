import { useState, useEffect, useCallback } from "react";

export function useLikePost(postId: string, initialLikes: number) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch whether the user has liked the post
  useEffect(() => {
    if (!postId) return;
    fetch(`/api/posts/${postId}/like`)
      .then((res) => res.json())
      .then((data) => {
        setLiked(!!data.liked);
      })
      .catch(() => setLiked(false));
  }, [postId]);

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
      } else {
        setLiked(false);
        setLikes((l) => Math.max(l - 1, 0));
        const res = await fetch(`/api/posts/${postId}/like`, {
          method: "DELETE",
        });
        const data = await res.json();
        setLiked(!!data.liked);
        setLikes(data.likes ?? 0);
      }
    } catch (err: any) {
      setError("Failed to update like");
    } finally {
      setLoading(false);
    }
  }, [postId, liked]);

  return { liked, likes, toggleLike, loading, error };
}
