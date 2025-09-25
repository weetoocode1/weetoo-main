import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Add a comment to a post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const postId = id;
  const { content, parent_id } = await req.json();

  // Auth required
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!content || !postId)
    return NextResponse.json(
      { error: "Missing content or postId" },
      { status: 400 }
    );

  // Call atomic function to add comment and increment counter
  const { data: newCommentId, error: fnError } = await supabase.rpc(
    "add_post_comment",
    {
      post_id_input: postId,
      user_id_input: user.id,
      content_input: content,
      parent_id_input: parent_id || null,
    }
  );
  if (fnError)
    return NextResponse.json({ error: fnError.message }, { status: 500 });

  // Fetch the new comment with user info
  const { data: comment, error: commentError } = await supabase
    .from("post_comments")
    .select(
      "*, user:users!user_id(id, first_name, last_name, nickname, avatar_url)"
    )
    .eq("id", newCommentId)
    .single();
  if (commentError)
    return NextResponse.json({ error: commentError.message }, { status: 500 });

  // Fetch the new comment count from posts table
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("comments")
    .eq("id", postId)
    .single();
  if (postError)
    return NextResponse.json({ error: postError.message }, { status: 500 });

  // Attempt to award comment reward. Do not block comment creation on reward errors.
  let reward: { id: string } | null = null;
  try {
    const { data: rewardData, error: rewardError } = await supabase.rpc(
      "award_post_comment",
      { p_user_id: user.id, p_post_id: postId, p_comment_id: newCommentId }
    );
    if (!rewardError) {
      reward = rewardData;
    }
  } catch (_) {
    // ignore
  }

  return NextResponse.json(
    { comment, commentCount: postData.comments, reward },
    { status: 201 }
  );
}

// GET: Fetch all comments for a post (threaded)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const postId = id;

  // Fetch all comments for the post, with user info (including admin-deleted ones)
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select(
      `
      *, 
      user:users!user_id(id, first_name, last_name, nickname, avatar_url),
      deleted_by:users!deleted_by_user_id(id, first_name, last_name, nickname)
    `
    )
    .eq("post_id", postId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false }); // Newest first

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Add a local PostComment type for threading
  interface PostComment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    parent_id?: string | null;
    created_at: string;
    updated_at: string;
    is_pinned?: boolean;
    deleted_by_admin?: boolean;
    deleted_at?: string;
    deleted_by_user_id?: string;
    user: {
      id: string;
      first_name?: string;
      last_name?: string;
      nickname?: string;
      avatar_url?: string;
    };
    deleted_by?: {
      id: string;
      first_name?: string;
      last_name?: string;
      nickname?: string;
    };
    replies?: PostComment[];
  }

  // Thread comments (one level: parent + replies)
  const commentMap: Record<string, PostComment> = {};
  const rootComments: PostComment[] = [];
  for (const c of (comments || []) as PostComment[]) {
    c.replies = [];
    commentMap[c.id] = c;
  }
  for (const c of (comments || []) as PostComment[]) {
    if (c.parent_id && commentMap[c.parent_id]) {
      commentMap[c.parent_id].replies!.push(c);
    } else {
      rootComments.push(c);
    }
  }

  // Sort replies within each comment by newest first
  for (const comment of rootComments) {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  }

  return NextResponse.json(rootComments, { status: 200 });
}
