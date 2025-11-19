import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  board: z.string().min(1, "Board is required"),
  images: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  excerpt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await req.json();
    const validatedData = createPostSchema.parse(body);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          title: validatedData.title,
          content: validatedData.content,
          board: validatedData.board,
          images: validatedData.images,
          tags: validatedData.tags,
          excerpt: validatedData.excerpt,
          author_id: user.id,
        },
      ])
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Try to award post creation reward via secure RPC. Do not block post creation on reward errors.
    let reward: { id: string } | null = null;
    try {
      const { data: rewardData, error: rewardError } = await supabase.rpc(
        "award_post_creation",
        { p_user_id: user.id, p_post_id: data.id }
      );
      if (!rewardError) {
        reward = rewardData;
      }
    } catch (_) {
      // swallow to avoid impacting post creation response
    }

    return NextResponse.json({ post: data, reward }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const board = searchParams.get("board");
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);

  if (!board)
    return NextResponse.json({ error: "Missing board" }, { status: 400 });

  const { data, error } = await supabase
    .from("posts")
    .select(
      `*, author:users ( id, first_name, last_name, avatar_url, nickname )`
    )
    .eq("board", board)
    .order("views", { ascending: false })
    .order("likes", { ascending: false })
    .order("comments", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Format the data for frontend
  const formattedData =
    data?.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt || post.content.slice(0, 120),
      content: post.content,
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
        id: post.author?.id,
        name:
          post.author?.first_name && post.author?.last_name
            ? `${post.author.first_name} ${post.author.last_name}`
            : "Anonymous",
        nickname: post.author?.nickname,
        avatar: post.author?.avatar_url,
      },
      images: post.images || [],
      tags: post.tags || [],
    })) || [];

  return NextResponse.json(formattedData, { status: 200 });
}
