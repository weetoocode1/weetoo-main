import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

interface PlaybackResolution {
  object?: { id?: string; type?: string };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const resolvedParams = await params;
    const streamId = resolvedParams.streamId;

    if (!streamId) {
      return NextResponse.json(
        { error: "Stream ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: stream, error: streamError } = await supabase
      .from("user_streams")
      .select("playback_id, status")
      .eq("stream_id", streamId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (!stream.playback_id) {
      return NextResponse.json({ viewers: 0 });
    }
    let activeViewerCount = 0;

    try {
      // First, attempt to treat the provided ID as a live stream ID
      const liveStream = await muxClient.video.liveStreams.retrieve(streamId);
      activeViewerCount =
        (liveStream as { active_viewer_count?: number }).active_viewer_count ||
        0;
    } catch (_err) {
      // If that's not a valid live stream id, resolve via playback_id → object → live_stream id
      try {
        const playbackObj = (await muxClient.video.playbackIds.retrieve(
          stream.playback_id
        )) as unknown as PlaybackResolution;
        // playbackObj.example: { id: '...', policy: 'public', object: { type: 'live_stream', id: 'ls_...' } }
        const liveId = playbackObj?.object?.id as string | undefined;
        if (liveId) {
          const ls = await muxClient.video.liveStreams.retrieve(liveId);
          activeViewerCount =
            (ls as { active_viewer_count?: number }).active_viewer_count || 0;
        }
      } catch {}
    }

    return NextResponse.json({
      viewers: activeViewerCount,
      engaged: activeViewerCount,
      buffering: 0,
    });
  } catch (error) {
    console.error("Error fetching live viewers:", error);
    return NextResponse.json({ viewers: 0 });
  }
}
