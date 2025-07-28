import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const supabase = await createClient();
  const { id: postId, commentId } = await params;

  // Auth required
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Check if the user is the author of the comment
  const { data: comment, error: commentError } = await supabase
    .from("post_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();
  if (commentError) {
    if (commentError.code === "PGRST116") {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: commentError.message }, { status: 500 });
  }
  if (comment.user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  } // Call atomic function to delete comment and decrement counter
  const { error: fnError } = await supabase.rpc("delete_post_comment", {
    comment_id_input: commentId,
  });
  if (fnError)
    return NextResponse.json({ error: fnError.message }, { status: 500 });

  // Fetch the new comment count from posts table
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("comments")
    .eq("id", postId)
    .single();
  if (postError)
    return NextResponse.json({ error: postError.message }, { status: 500 });

  return NextResponse.json(
    { success: true, commentCount: postData.comments },
    { status: 200 }
  );
}
