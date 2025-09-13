import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Utility function to sync like counts
async function syncLikeCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string
) {
  try {
    // Get actual count from post_likes table
    const { count, error: countError } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      console.error("Count error:", countError);
      return null;
    }

    // Update the posts table with the correct count
    const { error: updateError } = await supabase
      .from("posts")
      .update({ likes: count || 0 })
      .eq("id", postId);

    if (updateError) {
      console.error("Update error:", updateError);
      return null;
    }

    return count || 0;
  } catch (error) {
    console.error("Sync error:", error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ liked: false, likes: 0 }, { status: 401 });

  // Get current like count from posts table
  const { data: post } = await supabase
    .from("posts")
    .select("likes")
    .eq("id", postId)
    .single();

  // Check if user has liked the post
  const { data: likeData } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Get actual count from post_likes table
  const { count: actualCount } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  // If there's a mismatch, sync the counts
  let finalLikes = post?.likes ?? 0;
  if (actualCount !== null && actualCount !== (post?.likes ?? 0)) {
    const syncedCount = await syncLikeCount(await supabase, postId);
    if (syncedCount !== null) {
      finalLikes = syncedCount;
    }
  }

  return NextResponse.json({
    liked: !!likeData,
    likes: finalLikes,
  });
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

  try {
    // First check if the user has already liked the post
    const { data: existingLike, error: checkError } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Check existing like error:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing like" },
        { status: 500 }
      );
    }

    // If already liked, return current state
    if (existingLike) {
      const { data: post } = await supabase
        .from("posts")
        .select("likes")
        .eq("id", postId)
        .single();

      return NextResponse.json({
        liked: true,
        likes: post?.likes ?? 0,
      });
    }

    // Try the RPC function first
    const { error: rpcError } = await supabase.rpc("like_post", {
      post_id_input: postId,
      user_id_input: user.id,
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      // If RPC fails, try manual approach
      const { error: insertError } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });

      if (insertError) {
        console.error("Manual insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to like post" },
          { status: 500 }
        );
      }

      // Get current likes count first
      const { data: currentPost } = await supabase
        .from("posts")
        .select("likes")
        .eq("id", postId)
        .single();

      // Manually update the likes count
      const { error: updateError } = await supabase
        .from("posts")
        .update({ likes: (currentPost?.likes ?? 0) + 1 })
        .eq("id", postId);

      if (updateError) {
        console.error("Manual update error:", updateError);
      }
    } else {
      console.log("✅ RPC function succeeded");
    }

    // Get updated like count
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("likes")
      .eq("id", postId)
      .single();

    if (postError) {
      console.error("Post fetch error:", postError);
      return NextResponse.json(
        { error: "Failed to get updated like count" },
        { status: 500 }
      );
    }

    // Check if the RPC function actually updated the counter
    // If not, manually sync it
    const { count: actualCount } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (actualCount !== null && actualCount !== (post?.likes ?? 0)) {
      console.log(
        `🔄 RPC didn't update counter properly. Syncing: ${
          post?.likes ?? 0
        } -> ${actualCount}`
      );
      const syncedCount = await syncLikeCount(await supabase, postId);
      if (syncedCount !== null) {
        post.likes = syncedCount;
        console.log(`✅ Synced to: ${syncedCount}`);
      }
    }

    // Check if the user has liked the post (for UI state)
    const { data: likeData, error: likeError } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (likeError) {
      console.error("Like data fetch error:", likeError);
      return NextResponse.json(
        { error: "Failed to get like status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      liked: !!likeData,
      likes: post?.likes ?? 0,
    });
  } catch (error) {
    console.error("Unexpected error in POST like:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

  try {
    // Try the RPC function first
    const { error: rpcError } = await supabase.rpc("unlike_post", {
      post_id_input: postId,
      user_id_input: user.id,
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      // If RPC fails, try manual approach
      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Manual delete error:", deleteError);
        return NextResponse.json(
          { error: "Failed to unlike post" },
          { status: 500 }
        );
      }

      // Get current likes count first
      const { data: currentPost } = await supabase
        .from("posts")
        .select("likes")
        .eq("id", postId)
        .single();

      // Manually update the likes count
      const { error: updateError } = await supabase
        .from("posts")
        .update({ likes: Math.max((currentPost?.likes ?? 0) - 1, 0) })
        .eq("id", postId);

      if (updateError) {
        console.error("Manual update error:", updateError);
      }
    }

    // Get updated like count
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("likes")
      .eq("id", postId)
      .single();

    if (postError) {
      console.error("Post fetch error:", postError);
      return NextResponse.json(
        { error: "Failed to get updated like count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      liked: false,
      likes: post?.likes ?? 0,
    });
  } catch (error) {
    console.error("Unexpected error in DELETE like:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
