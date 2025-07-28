import { useEffect } from "react";

export function useTrackPostView(postId: string) {
  useEffect(() => {
    if (!postId) return;
    // Only call once per session for this post
    const key = `viewed_post_${postId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/posts/${postId}/view`, { method: "POST" }).catch((error) => {
      console.error("Error tracking post view:", error);
      sessionStorage.removeItem(key);
    });
  }, [postId]);
}
