"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Post } from "@/types/post";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface TopPostsDisplayProps {
  board: string;
  boardDisplayName: string;
  badgeColor: string;
  badgeText: string;
  demoImages: string[];
  preloadedPosts?: Post[];
}

// Cache for storing fetched posts
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get cache from localStorage
const getCache = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`posts-cache-${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.error("Cache read error:", error);
  }
  return null;
};

// Set cache to localStorage
const setCache = (key: string, data: Post[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `posts-cache-${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Cache write error:", error);
  }
};

export function TopPostsDisplay({
  board,
  boardDisplayName,
  badgeColor,
  badgeText,
  demoImages,
  preloadedPosts,
}: TopPostsDisplayProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const hasUsedPreloadedData = useRef(false);

  useEffect(() => {
    // If we have preloaded data, use it immediately and don't fetch anything
    if (
      preloadedPosts &&
      preloadedPosts.length > 0 &&
      !hasUsedPreloadedData.current
    ) {
      setPosts(preloadedPosts);
      setLoading(false);
      setShowSkeleton(false);
      hasUsedPreloadedData.current = true;
      return;
    }

    // Only fetch if we don't have preloaded data
    const fetchPosts = async () => {
      // Check cache first - if we have data, show it immediately
      const cacheKey = `${board}-top-3`;
      const cached = getCache(cacheKey);

      if (cached) {
        setPosts(cached);
        return; // No loading state needed for cached data
      }

      // If no cache, show skeleton and fetch
      setShowSkeleton(true);
      setLoading(true);

      try {
        // Convert board parameter to database format
        const boardParam = board.replace("-board", "");
        const response = await fetch(
          `/api/posts?board=${encodeURIComponent(boardParam)}&limit=3`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data = await response.json();

        // Cache the data
        setCache(cacheKey, data);

        setPosts(data);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setPosts([]);
      } finally {
        setLoading(false);
        // Brief delay to show loading state
        setTimeout(() => setShowSkeleton(false), 300);
      }
    };

    // Only fetch if no preloaded data and we haven't used preloaded data
    if (
      (!preloadedPosts || preloadedPosts.length === 0) &&
      !hasUsedPreloadedData.current
    ) {
      fetchPosts();
    }
  }, [board, preloadedPosts?.length]); // Only depend on length to avoid unnecessary re-runs

  // Always show exactly 3 posts - use real posts first, then fill with fallback
  const realPosts = posts.slice(0, 3);
  const fallbackCount = Math.max(0, 3 - realPosts.length);
  const fallbackPosts = Array.from({ length: fallbackCount }, (_, index) => ({
    id: `fallback-${index}`,
    title: `Post Title ${realPosts.length + index + 1}`,
    content: "",
    excerpt: `This is a small description for post ${
      realPosts.length + index + 1
    } on the ${boardDisplayName}.`,
    board: board,
    views: 0,
    likes: 0,
    comments: 0,
    createdAt: "Demo Post",
    author: {
      id: `fallback-author-${index}`,
      name: `Trader ${realPosts.length + index + 1}`,
      nickname: undefined,
      avatar: undefined,
    },
    images: [],
    tags: [],
    isPlaceholder: true,
  }));

  const displayPosts = [...realPosts, ...fallbackPosts];

  // Loading skeleton - only show when actually loading
  if (loading && showSkeleton) {
    return (
      <Card className="bg-white/60 border-gray-200 p-6 shadow-lg hover:shadow-green-300/50 transition-shadow duration-300 dark:bg-gray-800/60 dark:border-gray-700 dark:hover:shadow-green-500/20">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              <div className="relative w-full h-40 overflow-hidden">
                <Skeleton className="w-full h-full" />
                <Skeleton className="absolute top-3 left-3 h-6 w-20 rounded-full" />
              </div>
              <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-3" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // If we have preloaded data, show immediately without animation
  if (preloadedPosts && preloadedPosts.length > 0) {
    return (
      <Card className="bg-white/60 border-gray-200 p-6 shadow-lg hover:shadow-green-300/50 transition-shadow duration-300 dark:bg-gray-800/60 dark:border-gray-700 dark:hover:shadow-green-500/20">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {boardDisplayName}
          </h3>
          <Badge variant="secondary" className={badgeColor}>
            {badgeText}
          </Badge>
        </div>
        <div className="space-y-4">
          {displayPosts.map((post, idx) =>
            post.isPlaceholder ? (
              // Fallback post (redirects to free-board)
              <Link key={post.id} href="/free-board" className="block">
                <div className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group">
                  <div className="relative w-full h-40 overflow-hidden">
                    <Image
                      src={demoImages[idx % demoImages.length]}
                      alt={`${boardDisplayName} Post ${idx + 1}`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
                      {boardDisplayName}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                    <span className="bg-transparent px-0 py-0 rounded text-base font-bold text-gray-900 dark:text-white shadow-none mb-1 line-clamp-1">
                      {post.title}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-1">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow -ml-1">
                        <AvatarFallback>
                          {post.author.name
                            ? post.author.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                            : "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                          {post.author.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                          Demo Post
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              // Real post (clickable)
              <Link
                key={post.id}
                href={`/${board}/${post.id}`}
                className="block"
              >
                <div className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group">
                  <div className="relative w-full h-40 overflow-hidden">
                    {post.images && post.images.length > 0 ? (
                      <Image
                        src={post.images[0]}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <Image
                        src={demoImages[idx % demoImages.length]}
                        alt={`${boardDisplayName} Post ${idx + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
                      {boardDisplayName}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                    <span className="bg-transparent px-0 py-0 rounded text-base font-bold text-gray-900 dark:text-white shadow-none mb-1 line-clamp-1">
                      {post.title}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-1">
                      {post.excerpt || "No description available."}
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow -ml-1">
                        <AvatarImage
                          src={post.author.avatar}
                          alt={post.author.name}
                        />
                        <AvatarFallback>
                          {post.author.name
                            ? post.author.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                          {post.author.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                          {post.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      </Card>
    );
  }

  // Regular case with animation (for when no preloaded data)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      viewport={{ once: true }}
    >
      <Card className="bg-white/60 border-gray-200 p-6 shadow-lg hover:shadow-green-300/50 transition-shadow duration-300 dark:bg-gray-800/60 dark:border-gray-700 dark:hover:shadow-green-500/20">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {boardDisplayName}
          </h3>
          <Badge variant="secondary" className={badgeColor}>
            {badgeText}
          </Badge>
        </div>
        <div className="space-y-4">
          {displayPosts.map((post, idx) =>
            post.isPlaceholder ? (
              // Fallback post (redirects to free-board)
              <Link key={post.id} href="/free-board" className="block">
                <div className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group">
                  <div className="relative w-full h-40 overflow-hidden">
                    <Image
                      src={demoImages[idx % demoImages.length]}
                      alt={`${boardDisplayName} Post ${idx + 1}`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
                      {boardDisplayName}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                    <span className="bg-transparent px-0 py-0 rounded text-base font-bold text-gray-900 dark:text-white shadow-none mb-1 line-clamp-1">
                      {post.title}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-1">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow -ml-1">
                        <AvatarFallback>
                          {post.author.name
                            ? post.author.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                            : "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                          {post.author.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                          Demo Post
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              // Real post (clickable)
              <Link
                key={post.id}
                href={`/${board}/${post.id}`}
                className="block"
              >
                <div className="relative bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group">
                  <div className="relative w-full h-40 overflow-hidden">
                    {post.images && post.images.length > 0 ? (
                      <Image
                        src={post.images[0]}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <Image
                        src={demoImages[idx % demoImages.length]}
                        alt={`${boardDisplayName} Post ${idx + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
                      {boardDisplayName}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
                    <span className="bg-transparent px-0 py-0 rounded text-base font-bold text-gray-900 dark:text-white shadow-none mb-1 line-clamp-1">
                      {post.title}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-1">
                      {post.excerpt || "No description available."}
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow -ml-1">
                        <AvatarImage
                          src={post.author.avatar}
                          alt={post.author.name}
                        />
                        <AvatarFallback>
                          {post.author.name
                            ? post.author.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                          {post.author.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                          {post.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      </Card>
    </motion.div>
  );
}
