import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE: Admin delete a comment
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

  // Check if user is admin or super_admin
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!["admin", "super_admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  if (!commentId || !postId)
    return NextResponse.json(
      { error: "Missing commentId or postId" },
      { status: 400 }
    );

  // Get the comment to check if it exists
  const { data: comment, error: commentError } = await supabase
    .from("post_comments")
    .select("id, post_id")
    .eq("id", commentId)
    .single();

  if (commentError || !comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Delete the comment using the admin delete function
  const { error: deleteError } = await supabase.rpc(
    "admin_delete_post_comment",
    {
      comment_id_input: commentId,
      admin_user_id: user.id,
    }
  );

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
