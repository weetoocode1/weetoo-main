"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ShowcaseGridProps, Post } from "@/types/post";
import Image from "next/image";

export function ShowcaseGrid({ board }: ShowcaseGridProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch top 6 posts for showcase
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        // Convert board parameter to database format
        const boardParam = board.replace("-board", "");
        const response = await fetch(`/api/posts?board=${boardParam}&limit=6`);
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        console.error("Failed to fetch showcase posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [board]);

  // Use the first 6 posts, or fallback placeholders
  const showcasePosts: Post[] = [
    ...(posts?.slice(0, 6) || []),
    ...Array(Math.max(0, 6 - (posts?.length || 0))).fill({
      id: "",
      title: "Showcase",
      content: "",
      excerpt: "No post available.",
      board: "",
      views: 0,
      likes: 0,
      comments: 0,
      createdAt: "",
      author: { id: "", name: "" },
      images: [],
      tags: [],
      isPlaceholder: true,
    }),
  ].slice(0, 6);

  // Grid layout order for each box
  const gridOrder = [
    {
      className: "col-span-2 row-span-2",
      size: "text-3xl md:text-4xl",
      num: "01",
    },
    {
      className: "col-span-2 row-span-1",
      size: "text-2xl md:text-3xl",
      num: "02",
    },
    {
      className: "col-span-2 row-span-1",
      size: "text-xl md:text-2xl",
      num: "03",
    },
    {
      className: "col-span-2 row-span-1",
      size: "text-2xl md:text-3xl",
      num: "04",
    },
    {
      className: "col-span-1 row-span-1",
      size: "text-lg md:text-xl",
      num: "05",
    },
    {
      className: "col-span-1 row-span-1",
      size: "text-lg md:text-xl",
      num: "06",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-4 grid-rows-3 gap-2 h-[700px] select-none">
        {gridOrder.map((_, i) => (
          <div
            key={i}
            className={`${gridOrder[i].className} border bg-background shadow-lg flex flex-col justify-end p-8 relative overflow-hidden`}
          >
            {/* Background skeleton */}
            <Skeleton className="absolute inset-0" />

            {/* Content skeleton */}
            <div className="relative z-10">
              <Skeleton className={`${gridOrder[i].size} h-8 w-3/4 mb-2`} />
              <Skeleton className="h-3 w-1/2" />
            </div>

            {/* Number skeleton */}
            <Skeleton className="absolute right-6 top-6 h-16 w-16 rounded-full opacity-20 z-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 grid-rows-3 gap-2 h-[700px] select-none">
      {showcasePosts.map((post, i) => (
        <Link
          key={post.id ? post.id : `placeholder-${i}`}
          href={post.isPlaceholder ? "#" : `/${board}/${post.id}`}
          className={`${gridOrder[i].className} border bg-background shadow-lg flex flex-col justify-end p-8 relative overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer block`}
        >
          {/* Background Image */}
          {post.images && post.images.length > 0 && (
            <div className="absolute inset-0 z-0">
              <Image
                src={post.images[0]}
                alt={post.title}
                fill
                className="object-cover"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                loading="lazy"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/70 group-hover:via-black/15 transition-all duration-300" />
            </div>
          )}

          {/* Content */}
          <div className="relative z-10">
            <span
              className={`${gridOrder[i].size} font-bold line-clamp-2 ${
                post.isPlaceholder
                  ? "text-muted-foreground"
                  : "text-white drop-shadow-lg"
              }`}
            >
              {post.title}
            </span>
            {post.excerpt && (
              <span
                className={`text-xs mt-1 line-clamp-2 ${
                  post.isPlaceholder
                    ? "text-muted-foreground/70"
                    : "text-white/90 drop-shadow-md"
                }`}
              >
                {post.excerpt}
              </span>
            )}
          </div>

          {/* Number overlay */}
          <span
            className={`absolute right-6 top-6 text-4xl md:text-5xl lg:text-7xl font-black z-10 select-none transition-all duration-300 ${
              post.isPlaceholder
                ? "text-muted-foreground/30 group-hover:text-muted-foreground/50"
                : "text-white/60 group-hover:text-white/80"
            }`}
          >
            {gridOrder[i].num}
          </span>
        </Link>
      ))}
    </div>
  );
}
