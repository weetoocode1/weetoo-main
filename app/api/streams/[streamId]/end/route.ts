import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@/lib/supabase/server";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: stream, error: fetchError } = await supabase
      .from("user_streams")
      .select("*")
      .eq("stream_id", streamId)
      .single();

    if (fetchError || !stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (stream.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await muxClient.video.liveStreams.update(streamId, {
        reconnect_window: 0,
      });
    } catch (muxError) {
      console.error("Error disconnecting stream from Mux:", muxError);
    }

    const { error: updateError } = await supabase
      .from("user_streams")
      .update({ 
        status: "idle", 
        updated_at: new Date().toISOString(),
        started_at: null 
      })
      .eq("stream_id", streamId);

    if (updateError) {
      console.error("Error updating stream status:", updateError);
      return NextResponse.json(
        { error: "Failed to update stream status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "idle",
    });
  } catch (error) {
    console.error("Error ending stream:", error);
    return NextResponse.json(
      { error: "Failed to end stream" },
      { status: 500 }
    );
  }
}
