"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@/types/post";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
}

export function FollowButton({ targetUserId, className }: FollowButtonProps) {
  const t = useTranslations("post");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Get current user and check if following
  useEffect(() => {
    const checkFollowStatus = async () => {
      setIsCheckingStatus(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, first_name, last_name, nickname, avatar_url")
          .eq("id", user.id)
          .single();
        setCurrentUser(userData);

        // Check if already following
        const { data: followData } = await supabase
          .from("user_followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .single();

        setIsFollowing(!!followData);
      } else {
        // User is not logged in
        setCurrentUser(null);
        setIsFollowing(false);
      }

      // Always set checking status to false after all checks are complete
      setIsCheckingStatus(false);
    };

    checkFollowStatus();
  }, [targetUserId]);

  const handleFollowToggle = async () => {
    if (!currentUser || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/follow", {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ followingId: targetUserId }),
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
      } else {
        console.error("Failed to toggle follow status");
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show skeleton while checking initial status
  if (isCheckingStatus) {
    return <Skeleton className={cn("h-9 w-16 rounded-md", className)} />;
  }

  // Don't show button if user is not logged in or is following themselves
  if (!currentUser || currentUser.id === targetUserId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      onClick={handleFollowToggle}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        className,
        "transition-all duration-200 ease-in-out",
        isFollowing &&
          isHovered &&
          "!bg-red-500 !text-white !border-red-500 hover:!bg-red-600"
      )}
    >
      {isFollowing ? (isHovered ? t("unfollow") : t("following")) : t("follow")}
    </Button>
  );
}
