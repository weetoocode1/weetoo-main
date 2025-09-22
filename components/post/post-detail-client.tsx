"use client";

import { CommentsSection } from "@/components/post/comments-section";
import { FollowButton } from "@/components/post/follow-button";
import { LikeButton } from "@/components/post/like-button";
import { SharePost } from "@/components/post/share-post";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useTrackPostView } from "@/hooks/use-track-post-view";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Post, User } from "@/types/post";
import { useTranslations } from "next-intl";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  Calendar,
  ChevronLeftIcon,
  Clock,
  Eye,
  MessageSquare,
  AlertTriangle,
  HeartIcon,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useRealtimeUpdates } from "@/hooks/use-realtime-updates";

// Type for the global Next.js internationalization object
interface NextIntlGlobal {
  NEXT_INTL_DO_NOT_USE?: (namespace: string) => {
    (key: string): string;
    (key: string, values?: Record<string, unknown>): string;
  };
}

const calculateReadingTime = (
  text: string,
  wordsPerMinute: number = 238
): string => {
  const t =
    (globalThis as NextIntlGlobal).NEXT_INTL_DO_NOT_USE?.("post") || undefined;
  if (!text?.trim()) {
    return t ? t("readingTimeLessThan") : "Less than 1 min read";
  }
  // Remove HTML tags and count words
  const words = text
    .replace(/<[^>]*>/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  // Calculate reading time and round up
  const minutes = Math.ceil(words / wordsPerMinute);
  if (minutes === 1) return t ? t("readingTimeOne") : "1 min read";
  return t ? t("readingTimeMany", { minutes }) : `${minutes} min read`;
};

interface PostDetailClientProps {
  post: Post;
  board: string;
}

export default function PostDetailClient({
  post,
  board,
}: PostDetailClientProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const t = useTranslations("post");
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [commentCount, setCommentCount] = React.useState(post.comments);
  const [viewCount, setViewCount] = React.useState(post.views);
  const [mounted, setMounted] = React.useState(false);

  // Verification restriction handlers
  const handleVerificationRequired = (action: string) => {
    if (!authUser?.identity_verified) {
      toast.error(`${t("identityVerificationRequired")} to ${action}.`);
      return false;
    }
    return true;
  };

  // Get current user with caching
  React.useEffect(() => {
    const getCurrentUser = async () => {
      // Check if we already have the user data cached
      const cachedUser = sessionStorage.getItem("currentUser");
      if (cachedUser) {
        setCurrentUser(JSON.parse(cachedUser));
        return;
      }

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
        // Cache the user data
        sessionStorage.setItem("currentUser", JSON.stringify(userData));
      }
    };
    getCurrentUser();

    // Listen for auth state changes to invalidate cache
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("currentUser");
        setCurrentUser(null);
      } else if (event === "SIGNED_IN" && session) {
        // Clear cache to force fresh fetch
        sessionStorage.removeItem("currentUser");
        getCurrentUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Set mounted to true after component mounts
  React.useEffect(() => {
    setMounted(true);
  }, []);

  useTrackPostView(post.id);

  // Set up realtime updates for views, likes, and comments (only after hydration)
  useRealtimeUpdates({
    postId: post.id,
    onViewUpdate: (newViewCount) => {
      console.log("🔄 Realtime view update:", newViewCount);
      setViewCount(newViewCount);
    },
    onLikeUpdate: (newLikeCount) => {
      console.log("🔄 Realtime like update:", newLikeCount);
      // This will be handled by the LikeButton component's own realtime updates
    },
    onCommentUpdate: () => {
      console.log("🔄 Realtime comment update triggered");
      // This will be handled by the CommentsSection component's own realtime updates
    },
  });

  if (!post)
    return <div className="text-center py-20">{t("postNotFound")}</div>;

  const readingTime = calculateReadingTime(post.content);

  // Determine if the current user is the author
  const isAuthor = currentUser && currentUser.id === post.author.id;

  // Determine if the user has viewed the post (sessionStorage)
  const hasViewed =
    mounted &&
    typeof window !== "undefined" &&
    sessionStorage.getItem(`viewed_post_${post.id}`);

  // Format date only on client side to avoid hydration issues
  const formattedCreatedAt =
    mounted && post.createdAt
      ? new Date(post.createdAt).toLocaleString()
      : post.createdAt
      ? new Date(post.createdAt).toISOString().split("T")[0] // Fallback to date only
      : "";

  return (
    <div className="bg-background text-foreground">
      <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4 lg:px-8">
        {/* Go Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition mb-6 sm:mb-8 cursor-pointer"
          aria-label={t("goBackAria")}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t("goBack")}
        </button>
        <article>
          <header className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 sm:mb-6">
              {post.title}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div className="flex w-full items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarImage
                      src={post.author.avatar || ""}
                      alt={post.author.name}
                    />
                    <AvatarFallback>
                      {post.author.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center gap-1.5">
                      {post.author.name}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {post.author.nickname ||
                        `@${post.author.name
                          .toLowerCase()
                          .replace(/\s+/g, "")}`}
                    </div>
                  </div>
                </div>
                {currentUser && currentUser.id !== post.author.id && (
                  <FollowButton
                    targetUserId={post.author.id}
                    className="w-fit"
                  />
                )}
              </div>
            </div>
            <div className="h-2" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-4 sm:mb-6 mt-1 relative">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{formattedCreatedAt}</span>
              </div>
              <span className="hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                <span>{t("views", { count: viewCount })}</span>
              </div>
              <span className="hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{readingTime}</span>
              </div>
              {(isAuthor || hasViewed) && (
                <Badge variant="default" className="ml-auto">
                  {t("youViewedThis")}
                </Badge>
              )}
            </div>
          </header>

          {post.images && post.images.length > 0 && (
            <div className="mb-6 sm:mb-8">
              {post.images.length > 1 ? (
                <div>
                  <Carousel setApi={setApi} className="w-full">
                    <CarouselContent>
                      {post.images.map((img: string, index: number) => (
                        <CarouselItem key={index}>
                          <div className="relative aspect-video rounded-lg overflow-hidden">
                            <Image
                              src={img}
                              alt={`${post.title} image ${index + 1}`}
                              fill
                              className="object-cover"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                              priority={index === 0}
                              loading={index === 0 ? "eager" : "lazy"}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                  {post.images.length > 1 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {post.images.map((img: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => api?.scrollTo(index)}
                          className={cn(
                            "relative transition-all",
                            current === index
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "opacity-50 hover:opacity-100"
                          )}
                        >
                          <div className="relative h-12 w-20 sm:h-16 sm:w-24 rounded-md overflow-hidden">
                            <Image
                              src={img}
                              alt={`thumbnail ${index + 1}`}
                              fill
                              className="object-cover"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                              loading="lazy"
                              sizes="(max-width: 768px) 80px, 96px"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={post.images[0]}
                    alt={post.title}
                    fill
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    priority
                    loading="eager"
                  />
                </div>
              )}
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="mb-6 sm:mb-8 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground mr-2">
                {t("tags")}
              </span>
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div
            className="prose prose-base sm:prose-lg dark:prose-invert max-w-none mx-auto whitespace-pre-line leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(post.content || ""),
            }}
          />

          {/* Post Actions: Likes, Comments, Share */}
          <div className="flex items-center gap-4 sm:gap-6 text-muted-foreground text-sm mt-6 mb-6 sm:mb-8">
            {!mounted ? (
              // Hydration-safe placeholder (same on server and before client mount)
              <button
                disabled
                aria-pressed={false}
                aria-label={t("likePostAria")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background opacity-60 cursor-not-allowed text-sm font-medium select-none"
              >
                <HeartIcon
                  className="h-5 w-5 transition-all text-muted-foreground"
                  aria-hidden="true"
                />
                <span>
                  {post.likes} {post.likes === 1 ? t("like") : t("likes")}
                </span>
                <span className="sr-only">{t("likes")}</span>
              </button>
            ) : authUser?.identity_verified ? (
              <LikeButton postId={post.id} initialLikes={post.likes} />
            ) : (
              <button
                className="flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                onClick={() => handleVerificationRequired("like posts")}
                title={t("identityVerificationRequired")}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{t("like")}</span>
              </button>
            )}

            {!mounted ? (
              <button
                disabled
                aria-label={t("viewCommentsAria")}
                className="flex items-center gap-1.5 transition opacity-60 cursor-not-allowed"
              >
                <MessageSquare className="h-5 w-5" />
                {commentCount}{" "}
                {commentCount === 1 ? t("comment") : t("comments")}
              </button>
            ) : (
              <button
                className={`flex items-center gap-1.5 transition ${
                  authUser?.identity_verified
                    ? "hover:text-primary"
                    : "opacity-50 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (authUser?.identity_verified) {
                    // Scroll to comments section
                    document
                      .getElementById("comments-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else {
                    handleVerificationRequired("comment on posts");
                  }
                }}
                title={
                  authUser?.identity_verified
                    ? t("viewComments")
                    : t("identityVerificationRequired")
                }
              >
                <MessageSquare className="h-5 w-5" />
                {commentCount}{" "}
                {commentCount === 1 ? t("comment") : t("comments")}
              </button>
            )}

            {!mounted ? (
              <button
                disabled
                aria-label={t("sharePostAria")}
                className="flex items-center gap-1.5 opacity-60 cursor-not-allowed"
              >
                <Share2 className="h-4 w-4" />
                <span>{t("share")}</span>
              </button>
            ) : authUser?.identity_verified ? (
              <SharePost
                post={{
                  title: post.title,
                  id: post.id,
                  board: board,
                }}
                className="text-muted-foreground hover:text-primary"
              />
            ) : (
              <button
                className="flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                onClick={() => handleVerificationRequired("share posts")}
                title={t("identityVerificationRequired")}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{t("share")}</span>
              </button>
            )}
          </div>

          {/* Comments Section */}
          <div id="comments-section">
            {authUser?.identity_verified ? (
              <CommentsSection
                postId={post.id}
                commentCount={commentCount}
                setCommentCount={setCommentCount}
              />
            ) : (
              <div className="p-8 text-center space-y-4 border border-border rounded-lg bg-muted/30">
                <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-950/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("commentsRestricted")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("commentsRestrictedDesc")}
                  </p>
                  <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    🔒 {t("identityVerificationRequired")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
