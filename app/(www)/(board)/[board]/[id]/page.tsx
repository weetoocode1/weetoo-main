import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { PostPageProps, Post } from "@/types/post";
import PostDetailClient from "@/components/post/post-detail-client";

// Ensure this page is always dynamic and never cached so edits reflect immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Cache metadata for better performance and to prevent flickering
const metadataCache = new Map<
  string,
  { metadata: Metadata; timestamp: number }
>();
const METADATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cleanup old cache entries periodically
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of metadataCache.entries()) {
    if (now - value.timestamp > METADATA_CACHE_DURATION) {
      metadataCache.delete(key);
    }
  }
};

// Run cleanup every 10 minutes
if (typeof globalThis !== "undefined") {
  setInterval(cleanupCache, 10 * 60 * 1000);
}

// Shared function to fetch post with author details
async function fetchPostWithAuthor(id: string) {
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("posts")
      .select(
        `*, author:users ( id, first_name, last_name, avatar_url, nickname )`
      )
      .eq("id", id)
      .single();

    return result;
  } catch (error) {
    console.error("Error fetching post with author details:", error);
    // Return a structured error response that matches the expected format
    return {
      data: null,
      error: {
        message: "Failed to fetch post data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

// Generate metadata for SEO with caching to prevent flickering
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { id } = await params;

  // Check cache first
  const cached = metadataCache.get(id);
  if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
    return cached.metadata;
  }

  try {
    const { data: post } = await fetchPostWithAuthor(id);

    let metadata: Metadata;

    if (!post) {
      metadata = {
        title: "Post Not Found | Weetoo",
        description: "The requested post could not be found.",
      };
    } else {
      metadata = {
        title: `${post.title} | Weetoo`,
        description: post.excerpt || post.content.slice(0, 160),
        openGraph: {
          title: `${post.title} | Weetoo`,
          description: post.excerpt || post.content.slice(0, 160),
          type: "article",
        },
        twitter: {
          card: "summary_large_image",
          title: `${post.title} | Weetoo`,
          description: post.excerpt || post.content.slice(0, 160),
        },
      };
    }

    // Cache the metadata
    metadataCache.set(id, { metadata, timestamp: Date.now() });

    return metadata;
  } catch (_error) {
    // Return fallback metadata on error to prevent flickering
    const fallbackMetadata: Metadata = {
      title: "Weetoo",
      description: "Discover and share insights on Weetoo",
    };

    // Cache the fallback to prevent repeated errors
    metadataCache.set(id, {
      metadata: fallbackMetadata,
      timestamp: Date.now(),
    });

    return fallbackMetadata;
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { id, board } = await params;
  const { data: post, error } = await fetchPostWithAuthor(id);

  if (error || !post) {
    notFound();
  }

  const EXCERPT_LENGTH = 160;
  // Format the post data
  const formattedPost: Post = {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || post.content.slice(0, EXCERPT_LENGTH),
    board: post.board,
    views: post.views || 0,
    likes: post.likes || 0,
    comments: post.comments || 0,
    createdAt: new Date(post.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    author: {
      id: post.author?.id || "",
      name:
        post.author?.first_name && post.author?.last_name
          ? `${post.author.first_name} ${post.author.last_name}`
          : "Anonymous",
      nickname: post.author?.nickname,
      avatar: post.author?.avatar_url,
    },
    images: post.images || [],
    tags: post.tags || [],
  };

  return <PostDetailClient post={formattedPost} board={board} />;
}
