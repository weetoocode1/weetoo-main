import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { title, content, board, images, tags, excerpt } = await req.json();

  if (!title || !content || !board) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        title,
        content,
        board,
        images,
        tags,
        excerpt,
        author_id: user.id,
      },
    ])
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
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
      createdAt: new Date(post.created_at).toLocaleDateString(),
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
  return NextResponse.json(data, { status: 200 });
}
