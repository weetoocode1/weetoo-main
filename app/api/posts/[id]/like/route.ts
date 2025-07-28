import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ liked: false }, { status: 401 });

  const { data } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ liked: !!data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Only call the like_post function, which handles both insert and counter
  const { error: rpcError } = await supabase.rpc("like_post", {
    post_id_input: postId,
    user_id_input: user.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
  }
  // Get updated like count
  const { data: post } = await supabase
    .from("posts")
    .select("likes")
    .eq("id", postId)
    .single();

  // Check if the user has liked the post (for UI state)
  const { data: likeData } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ liked: !!likeData, likes: post?.likes ?? 0 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Only call the unlike_post function, which handles both delete and counter
  await supabase.rpc("unlike_post", {
    post_id_input: postId,
    user_id_input: user.id,
  });

  // Get updated like count
  const { data: post } = await supabase
    .from("posts")
    .select("likes")
    .eq("id", postId)
    .single();

  return NextResponse.json({ liked: false, likes: post?.likes ?? 0 });
}
