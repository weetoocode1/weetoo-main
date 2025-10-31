import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

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

    // If DVR is enabled, fetch the asset playback ID for better DVR support
    let assetPlaybackId: string | null = null;
    if (stream.enable_dvr) {
      try {
        const liveStream = await muxClient.video.liveStreams.retrieve(streamId);
        const activeAssetId = (liveStream as { active_asset_id?: string })
          .active_asset_id;

        if (activeAssetId) {
          const asset = await muxClient.video.assets.retrieve(activeAssetId);
          const assetPlaybackIds =
            (asset as { playback_ids?: Array<{ id?: string }> }).playback_ids ||
            [];
          if (assetPlaybackIds.length > 0 && assetPlaybackIds[0].id) {
            assetPlaybackId = assetPlaybackIds[0].id;
          }
        }
      } catch (muxError) {
        console.error("Error fetching asset playback ID for DVR:", muxError);
        // Continue without asset playback ID - will use live stream playback ID
      }
    }

    const now = new Date().toISOString();
    const updateData: {
      status: string;
      updated_at: string;
      started_at?: string;
      playback_id?: string;
    } = {
      status: "active",
      updated_at: now,
    };

    // Only set started_at if it's not already set (first time going live)
    if (!stream.started_at) {
      updateData.started_at = now;
    }

    // Update playback ID if we got an asset playback ID for DVR
    if (assetPlaybackId && assetPlaybackId !== stream.playback_id) {
      updateData.playback_id = assetPlaybackId;
    }

    const { error: updateError } = await supabase
      .from("user_streams")
      .update(updateData)
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
      status: "active",
    });
  } catch (error) {
    console.error("Error starting stream:", error);
    return NextResponse.json(
      { error: "Failed to start stream" },
      { status: 500 }
    );
  }
}
