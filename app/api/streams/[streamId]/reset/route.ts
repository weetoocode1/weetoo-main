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

    let newStreamKey: string;

    try {
      await muxClient.video.liveStreams.resetStreamKey(streamId);
      const liveStream = await muxClient.video.liveStreams.retrieve(streamId);
      newStreamKey = (liveStream as { stream_key?: string }).stream_key || "";
    } catch (muxError) {
      console.error("Error resetting stream key in Mux:", muxError);
      return NextResponse.json(
        { error: "Failed to reset stream key" },
        { status: 500 }
      );
    }

    const { data: updatedStream, error: updateError } = await supabase
      .from("user_streams")
      .update({
        stream_key: newStreamKey,
        updated_at: new Date().toISOString(),
      })
      .eq("stream_id", streamId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating stream:", updateError);
      return NextResponse.json(
        { error: "Failed to update stream" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stream: {
        streamKey: updatedStream.stream_key,
        rtmpUrl: updatedStream.rtmp_url,
        playbackId: updatedStream.playback_id,
      },
    });
  } catch (error) {
    console.error("Error resetting stream:", error);
    return NextResponse.json(
      { error: "Failed to reset stream" },
      { status: 500 }
    );
  }
}
