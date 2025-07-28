"use client";

import { CommentsSection } from "@/components/post/comments-section";
import { LikeButton } from "@/components/post/like-button";
import { SharePost } from "@/components/post/share-post";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Calendar,
  ChevronLeftIcon,
  Clock,
  Eye,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";

const calculateReadingTime = (
  text: string,
  wordsPerMinute: number = 238
): string => {
  if (!text?.trim()) {
    return "Less than 1 min read";
  }
  // Remove HTML tags and count words
  const words = text
    .replace(/<[^>]*>/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  // Calculate reading time and round up
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes === 1 ? "1 min read" : `${minutes} min read`;
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
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [commentCount, setCommentCount] = React.useState(post.comments);

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

  useTrackPostView(post.id);

  // Format post.createdAt on the client only
  const [formattedCreatedAt, setFormattedCreatedAt] = React.useState("...");
  React.useEffect(() => {
    if (post.createdAt) {
      setFormattedCreatedAt(new Date(post.createdAt).toLocaleString());
    }
  }, [post.createdAt]);

  if (!post) return <div className="text-center py-20">Post not found.</div>;

  const readingTime = calculateReadingTime(post.content);

  // Determine if the current user is the author
  const isAuthor = currentUser && currentUser.id === post.author.id;

  // Determine if the user has viewed the post (sessionStorage)
  const hasViewed =
    typeof window !== "undefined" &&
    sessionStorage.getItem(`viewed_post_${post.id}`);

  return (
    <div className="bg-background text-foreground">
      <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4 lg:px-8">
        {/* Go Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition mb-6 sm:mb-8 cursor-pointer"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Go Back
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
                  <Button variant="outline" size="sm" className="w-fit">
                    Follow
                  </Button>
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
                <span>{post.views} views</span>
              </div>
              <span className="hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{readingTime}</span>
              </div>
              {(isAuthor || hasViewed) && (
                <Badge variant="default" className="ml-auto">
                  You viewed this
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
                Tags:
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
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Post Actions: Likes, Comments, Share */}
          <div className="flex items-center gap-4 sm:gap-6 text-muted-foreground text-sm mt-6 mb-6 sm:mb-8">
            <LikeButton postId={post.id} initialLikes={post.likes} />
            <button className="flex items-center gap-1.5 hover:text-primary transition">
              <MessageSquare className="h-5 w-5" />
              {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
            </button>
            <SharePost
              post={{
                title: post.title,
                id: post.id,
                board: board,
              }}
              className="text-muted-foreground hover:text-primary"
            />
          </div>

          {/* Comments Section */}
          <CommentsSection
            postId={post.id}
            commentCount={commentCount}
            setCommentCount={setCommentCount}
          />
        </article>
      </div>
    </div>
  );
}
