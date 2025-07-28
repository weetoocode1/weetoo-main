import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;

  // Get user info
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get IP and User-Agent for anonymous tracking
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const userAgent = req.headers.get("user-agent") || "unknown";
  let ipHash = null;
  if (!user) {
    // Hash IP + UA for privacy
    ipHash = crypto
      .createHash("sha256")
      .update(ip + userAgent)
      .digest("hex");
  }

  // Check if this user/IP has already viewed the post
  let alreadyViewed = false;
  if (user) {
    const { data } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    alreadyViewed = !!data;
  } else {
    const { data } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", postId)
      .eq("ip_hash", ipHash)
      .maybeSingle();
    alreadyViewed = !!data;
  }

  if (!alreadyViewed) {
    // Insert into post_views
    await supabase.from("post_views").insert({
      post_id: postId,
      user_id: user ? user.id : null,
      ip_hash: ipHash,
      user_agent: userAgent,
    });
    // Increment views in posts table
    await supabase.rpc("increment_post_views", { post_id_input: postId });
  }

  // Get the new total views
  const { data: post } = await supabase
    .from("posts")
    .select("views")
    .eq("id", postId)
    .single();

  return NextResponse.json({ views: post?.views ?? 0 });
}
