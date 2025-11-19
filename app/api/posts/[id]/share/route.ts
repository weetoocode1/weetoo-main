import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: postId } = await params;

  // Validate UUID format for postId
  if (!z.string().uuid().safeParse(postId).success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Attempt to award share reward; do not block on errors
  let reward: { id: string } | null = null;
  let errorMessage: string | null = null;
  try {
    const { data: rewardData, error } = await supabase.rpc("award_post_share", {
      p_user_id: user.id,
      p_post_id: postId,
    });
    if (!error) reward = rewardData;
    else if (error) errorMessage = error.message;
  } catch (e: Error | unknown) {
    errorMessage =
      e && typeof e === "object" && "message" in e
        ? (e as Error).message
        : "Failed to award share";
  }

  return NextResponse.json({ ok: true, reward, error: errorMessage });
}
