"use client";

import { useLikePost } from "@/hooks/use-like-post";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHydration } from "@/hooks/use-hydration";

interface LikeButtonProps {
  postId: string;
  initialLikes: number;
  className?: string;
}

export function LikeButton({
  postId,
  initialLikes,
  className,
}: LikeButtonProps) {
  const { liked, likes, toggleLike, loading } = useLikePost(
    postId,
    initialLikes
  );
  const isHydrated = useHydration();

  // Use initial values during SSR to prevent hydration mismatch
  // Only show real data after hydration is complete
  const displayLiked = isHydrated ? liked : false;
  const displayLikes = isHydrated ? likes : initialLikes;
  const displayLoading = isHydrated ? loading : false;

  return (
    <button
      onClick={toggleLike}
      disabled={displayLoading || !isHydrated}
      aria-pressed={displayLiked}
      aria-label={displayLiked ? "Unlike post" : "Like post"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors text-sm font-medium select-none",
        displayLiked
          ? "text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
          : "text-muted-foreground",
        (displayLoading || !isHydrated) && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all",
          displayLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <span>
        {displayLikes} {displayLikes === 1 ? "Like" : "Likes"}
      </span>
      <span className="sr-only">likes</span>
    </button>
  );
}
